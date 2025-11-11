defmodule WandererOps.Map.Utils do
  require Logger

  def filter_connected(map_id, systems, connections) do
    # find system marked as home
    case Enum.find(systems, &(&1["status"] == 1)) do
      nil ->
        {:ok,
         %{
           systems: [],
           connections: []
         }}

      home_system ->
        home_id = home_system["solar_system_id"]
        adj = build_adjacency(connections)
        reachable_ids = bfs(adj, [home_id], MapSet.new([home_id]))

        filtered_systems =
          Enum.filter(systems, &MapSet.member?(reachable_ids, &1["solar_system_id"]))

        filtered_connections = Enum.filter(connections, &connection_in?(&1, reachable_ids))

        {:ok,
         %{
           systems: filtered_systems |> Enum.map(fn system -> %{system | "map_id" => map_id} end),
           connections: filtered_connections
         }}
    end
  end

  def prepare_cached_data(maps) do
    # Sort maps to prioritize main maps first
    sorted_maps = Enum.sort_by(maps, & &1.is_main, :desc)

    # Build connection registry for border detection
    connection_registry = build_system_connection_registry(sorted_maps)

    # Detect border systems (logs internally)
    border_systems_map = detect_border_systems(connection_registry, sorted_maps)

    # Send notifications to map servers about detected border systems
    send_border_notifications(border_systems_map, sorted_maps)

    # Process maps and assign unique systems/connections
    {cached_data, _used_connections, _used_systems} =
      sorted_maps
      |> Enum.reduce({%{}, MapSet.new(), MapSet.new()}, fn map,
                                                           {acc, used_connections, used_systems} ->
        raw_data = Cachex.get!(:maps_cache, map.id)

        case raw_data do
          %{systems: systems, connections: connections} ->
            # Filter out systems and connections already claimed by other maps
            unique_systems = filter_unique_systems(systems, used_systems)
            unique_connections = filter_unique_connections(connections, used_connections)

            # Add these systems to the used set
            new_used_systems =
              Enum.reduce(unique_systems, used_systems, fn system, acc_used ->
                MapSet.put(acc_used, system["solar_system_id"])
              end)

            # Add these connections to the used set
            new_used_connections =
              Enum.reduce(unique_connections, used_connections, fn conn, acc_used ->
                connection_key = {conn["solar_system_source"], conn["solar_system_target"]}
                MapSet.put(acc_used, connection_key)
              end)

            # Enrich systems with border info and UI data
            enriched_systems =
              unique_systems
              |> enrich_systems_with_border_info(border_systems_map)
              |> Enum.map(&map_ui_system/1)

            filtered_data = %{
              systems: enriched_systems,
              connections: unique_connections
            }

            {Map.put(acc, map.id, filtered_data), new_used_connections, new_used_systems}

          _ ->
            {Map.put(acc, map.id, raw_data), used_connections, used_systems}
        end
      end)

    {:ok, cached_data}
  end

  defp build_adjacency(connections) do
    Enum.reduce(connections, %{}, fn conn, acc ->
      source = conn["solar_system_source"]
      target = conn["solar_system_target"]

      acc
      |> Map.update(source, [target], &[target | &1])
      |> Map.update(target, [source], &[source | &1])
    end)
  end

  defp bfs(adj, queue, visited) do
    case queue do
      [] ->
        visited

      [current | rest] ->
        neighbors = Map.get(adj, current, [])

        {new_visited, new_nodes} =
          Enum.reduce(neighbors, {visited, []}, fn neighbor, {vs, nodes} ->
            if MapSet.member?(vs, neighbor) do
              {vs, nodes}
            else
              {MapSet.put(vs, neighbor), [neighbor | nodes]}
            end
          end)

        bfs(adj, rest ++ new_nodes, new_visited)
    end
  end

  defp connection_in?(conn, reachable_ids) do
    MapSet.member?(reachable_ids, conn["solar_system_source"]) &&
      MapSet.member?(reachable_ids, conn["solar_system_target"])
  end

  # Build a registry of system connections per map
  # Returns: %{solar_system_id => %{map_id => MapSet.new([connected_system_ids])}}
  defp build_system_connection_registry(maps) do
    Enum.reduce(maps, %{}, fn map, acc ->
      raw_data = Cachex.get!(:maps_all_data_cache, map.id)

      Logger.info(
        "Building connection registry for map #{map.id}, is_main: #{map.is_main}, cache_data: #{inspect(raw_data != nil)}"
      )

      case raw_data do
        %{"systems" => systems, "connections" => connections} ->
          Logger.info(
            "Map #{map.id}: #{length(systems)} systems, #{length(connections)} connections"
          )

          # Log first connection to see structure
          if length(connections) > 0 do
            Logger.info(
              "Map #{map.id}: First connection structure: #{inspect(Enum.at(connections, 0))}"
            )
          end

          # Get all system IDs in this map
          system_ids = MapSet.new(systems, & &1["solar_system_id"])

          # For each system in this map, find its connections
          Enum.reduce(system_ids, acc, fn system_id, registry ->
            # Find all connections involving this system
            connected_systems =
              connections
              |> Enum.filter(fn conn ->
                conn["solar_system_source"] == system_id ||
                  conn["solar_system_target"] == system_id
              end)
              |> Enum.map(fn conn ->
                # Get the "other end" of the connection
                if conn["solar_system_source"] == system_id do
                  conn["solar_system_target"]
                else
                  conn["solar_system_source"]
                end
              end)
              |> MapSet.new()

            # Update the registry
            Map.update(
              registry,
              system_id,
              %{map.id => connected_systems},
              fn existing ->
                Map.put(existing, map.id, connected_systems)
              end
            )
          end)

        _ ->
          Logger.warning(
            "Map #{map.id}: Cache data doesn't match expected structure or is nil: #{inspect(raw_data)}"
          )

          acc
      end
    end)
  end

  # Detect border systems using disjoint connection logic
  # A system is a border if it appears in both main and non-main maps
  # with COMPLETELY DISJOINT connection sets, and has at least one
  # connection in each map (empty connection sets are not borders)
  # Returns: %{solar_system_id => [map_ids_where_it_appears]}
  defp detect_border_systems(connection_registry, maps) do
    Logger.info("Starting border detection, registry size: #{map_size(connection_registry)}")

    # Find the main map
    main_map = Enum.find(maps, & &1.is_main)

    case main_map do
      nil ->
        Logger.warning("No main map found, cannot detect borders")
        # No main map, no borders
        %{}

      main_map ->
        main_map_id = main_map.id
        Logger.info("Main map ID: #{main_map_id}")

        # Find all systems that appear in multiple maps (including main)
        border_candidates =
          connection_registry
          |> Enum.filter(fn {_system_id, map_connections} ->
            # System appears in main map
            # And appears in at least one other map
            Map.has_key?(map_connections, main_map_id) &&
              map_size(map_connections) > 1
          end)

        Logger.info("Found #{length(border_candidates)} border candidates")

        # Check each candidate to see if connections are disjoint
        border_candidates
        |> Enum.reduce(%{}, fn {system_id, map_connections}, acc ->
          main_connections = Map.get(map_connections, main_map_id, MapSet.new())

          Logger.info(
            "Checking border candidate system_id=#{system_id}, main_connections: #{inspect(MapSet.to_list(main_connections))}, maps: #{inspect(Map.keys(map_connections))}"
          )

          # Check connections against all other maps
          other_map_ids = Map.keys(map_connections) -- [main_map_id]

          # Check if ALL other maps have disjoint connections
          # AND both main and other maps have at least one connection
          # Main map must have connections
          all_disjoint_and_non_empty =
            MapSet.size(main_connections) > 0 &&
              Enum.all?(other_map_ids, fn other_map_id ->
                other_connections = Map.get(map_connections, other_map_id, MapSet.new())

                Logger.info(
                  "  Other map #{other_map_id}, connections: #{inspect(MapSet.to_list(other_connections))}, size: #{MapSet.size(other_connections)}, disjoint: #{MapSet.disjoint?(main_connections, other_connections)}"
                )

                # Other map must have connections AND be disjoint from main
                MapSet.size(other_connections) > 0 &&
                  MapSet.disjoint?(main_connections, other_connections)
              end)

          if all_disjoint_and_non_empty do
            # This is a border system
            involved_maps = [main_map_id | other_map_ids]

            # Log the border system
            Logger.info(
              "✓ Border system detected: solar_system_id=#{system_id}, maps=#{inspect(involved_maps)}"
            )

            if involved_maps |> length() > 1 do
              Map.put(acc, system_id, involved_maps)
            else
              acc
            end
          else
            # Not a border - has shared connections
            Logger.info("✗ Not a border: solar_system_id=#{system_id} (failed disjoint check)")
            acc
          end
        end)
    end
  end

  # Filter out systems that are already claimed by other maps
  defp filter_unique_systems(systems, used_systems) do
    Enum.reject(systems, fn system ->
      MapSet.member?(used_systems, system["solar_system_id"])
    end)
  end

  # Filter out connections that are already claimed by other maps
  defp filter_unique_connections(connections, used_connections) do
    Enum.reject(connections, fn conn ->
      connection_key = {conn["solar_system_source"], conn["solar_system_target"]}

      MapSet.member?(used_connections, connection_key) ||
        MapSet.member?(
          used_connections,
          {conn["solar_system_target"], conn["solar_system_source"]}
        )
    end)
  end

  # Enrich systems with border information
  defp enrich_systems_with_border_info(systems, border_systems_map) do
    Enum.map(systems, fn system ->
      system_id = system["solar_system_id"]

      case Map.get(border_systems_map, system_id) do
        nil ->
          # Not a border system
          Map.merge(system, %{"is_border" => false, "border_maps" => []})

        border_maps ->
          # This is a border system
          Map.merge(system, %{"is_border" => true, "border_maps" => border_maps})
      end
    end)
  end

  # Add static info to system for UI display
  defp map_ui_system(%{"solar_system_id" => solar_system_id} = system) do
    {:ok, solar_system_info} =
      WandererOps.CachedInfo.get_system_static_info(solar_system_id)

    system |> Map.put("static_info", solar_system_info)
  end

  # Send border system notifications to corresponding map servers
  defp send_border_notifications(border_systems_map, maps) do
    # Group border systems by map_id
    # border_systems_map: %{solar_system_id => [map_id1, map_id2, ...]}
    # We need: %{map_id => [solar_system_id1, solar_system_id2, ...]}
    systems_by_map =
      Enum.reduce(border_systems_map, %{}, fn {solar_system_id, map_ids}, acc ->
        Enum.reduce(map_ids, acc, fn map_id, acc_inner ->
          Map.update(
            acc_inner,
            map_id,
            [solar_system_id],
            fn existing -> [solar_system_id | existing] end
          )
        end)
      end)

    # Send notification to ALL maps (even those with no border systems)
    Enum.each(maps, fn map ->
      system_ids = Map.get(systems_by_map, map.id, [])

      # Send broadcast notification with border system IDs (empty list if none)
      WandererOps.Map.Server.Impl.broadcast!(
        "server:#{map.id}",
        :border_systems_detected,
        %{
          border_systems: system_ids
        }
      )

      Logger.info(
        "Sent border notification to map #{map.id}: #{length(system_ids)} border systems"
      )
    end)

    :ok
  end
end

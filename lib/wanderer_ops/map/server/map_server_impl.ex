defmodule WandererOps.Map.Server.Impl do
  @moduledoc """
  Holds state for a map and exposes an interface to managing the map instance
  """
  require Logger

  alias WandererOps.Map.ApiClient

  @enforce_keys [
    :map_id
  ]

  defstruct [
    :map_id,
    map: nil,
    server_map_id: nil,
    map_opts: [],
    last_api_refresh_at: nil
  ]

  @pubsub_client Application.compile_env(:wanderer_ops, :pubsub_client)
  @refresh_data_timeout :timer.minutes(30)

  def new(), do: __struct__()
  def new(args), do: __struct__(args)

  def init(args) do
    map_id = args[:map_id]
    Logger.info("Starting map server for #{map_id}")

    %{
      map_id: map_id
    }
    |> new()
  end

  def load_state(%__MODULE__{map_id: map_id} = state) do
    Logger.warning(fn -> "Starting map server for #{map_id}: load_state" end)

    case WandererOps.Api.Map.by_id(map_id) do
      {:ok, map} ->
        if map.is_main do
          Cachex.put(
            :maps_shared_cache,
            "main",
            map_id
          )
        end

        ApiClient.get_map(map_url: map.map_url, api_key: map.public_api_key)
        |> case do
          {:ok,
           %{
             "data" => %{
               "id" => map_id
             }
           }} ->
            %{state | map: map, server_map_id: map_id}

          _ ->
            state
        end

      _ ->
        Logger.error("Failed to load map data. Try to restart server.")
        state
    end
  end

  def start_map(%__MODULE__{map_id: map_id, server_map_id: nil} = state) do
    Logger.warning(fn -> "Failed to load map data for #{map_id}" end)
    Process.send_after(self(), :stop, 100)

    state
  end

  def start_map(%__MODULE__{map: map, map_id: map_id} = state) do
    Logger.warning(fn -> "Started map server for #{map.map_url}" end)
    @pubsub_client.subscribe(WandererOps.PubSub, map.map_url)
    @pubsub_client.subscribe(WandererOps.PubSub, "server:#{map.id}")
    Process.send_after(self(), :refresh_data, 100)

    Cachex.put(
      :maps_cache,
      "#{map_id}:started",
      true
    )

    state
  end

  def stop_map(%{map_id: map_id} = state) do
    Logger.warning(fn -> "Stopping map server for #{map_id}" end)

    Cachex.put(
      :maps_cache,
      "#{map_id}:started",
      false
    )

    # WandererApp.Cache.delete("map_#{map_id}:started")

    # :telemetry.execute([:wanderer_app, :map, :stopped], %{count: 1})

    state
  end

  def get_map(%{map: map} = _state), do: {:ok, map}

  def get_system(
        %{map: map, server_map_id: server_map_id} = _state,
        solar_system_id
      ) do
    ApiClient.get_map_system(server_map_id, solar_system_id,
      map_url: map.map_url,
      api_key: map.public_api_key
    )
    |> case do
      {:ok, %{"data" => [%{"attributes" => system}]}} -> {:ok, system}
      _ -> {:ok, nil}
    end
  end

  def get_connection(
        %{map: map} = _state,
        solar_system_source_id,
        solar_system_target_id
      ) do
    ApiClient.get_map_connection(
      solar_system_source_id,
      solar_system_target_id,
      map_url: map.map_url,
      api_key: map.public_api_key
    )
    |> case do
      {:ok, %{"data" => [connection]}} ->
        {:ok, connection}

      _error ->
        {:ok, nil}
    end
  end

  def upsert_map_systems_and_connections(
        %{map: map} = _state,
        update
      ),
      do:
        ApiClient.upsert_map_systems_and_connections(update,
          map_url: map.map_url,
          api_key: map.public_api_key
        )

  def handle_event(:refresh_data, %{map: map} = state) do
    Process.send_after(self(), :refresh_data, @refresh_data_timeout)

    case refresh_map_data_from_api(map) do
      {:ok, _} ->
        %{state | last_api_refresh_at: System.monotonic_time(:second)}

      _ ->
        state
    end
  end

  def handle_event({ref, _result}, %{map_id: _map_id} = state) when is_reference(ref) do
    Process.demonitor(ref, [:flush])

    state
  end

  def handle_event(
        %{
          event: :add_system,
          payload: %{"payload" => %{"solar_system_id" => solar_system_id} = system}
        },
        %{map: map} = state
      ) do
    {:ok, main_map_id} = Cachex.get(:maps_shared_cache, "main")

    if not is_nil(main_map_id) && map.id == main_map_id do
      {systems, connections} = get_cached_data(map.id)
      update_cache(map.id, [system | systems], connections)
    end

    if not is_nil(main_map_id) && map.id != main_map_id do
      # Use GenServer.call to get system from the main map
      WandererOps.Map.Server.get_system(main_map_id, solar_system_id)
      |> case do
        {:ok, system_info} when not is_nil(system_info) ->
          system_info =
            system_info
            |> Map.drop(["position_x", "position_y"])
            |> Map.put("update_existing", true)

          state
          |> upsert_map_systems_and_connections(%{
            systems: [system_info]
          })

          # Update cache after API call
          {systems, connections} = get_cached_data(map.id)
          update_cache(map.id, [system | systems], connections)

          :ok

        _ ->
          :ok
      end
    end

    state
  end

  def handle_event(
        %{
          event: :system_metadata_changed,
          payload: %{"payload" => %{"solar_system_id" => solar_system_id} = system_info}
        },
        %{map: map} = state
      ) do
    {:ok, main_map_id} = Cachex.get(:maps_shared_cache, "main")

    if not is_nil(main_map_id) && map.id == main_map_id do
      {:ok, maps} = WandererOps.Api.Map.read()

      maps
      |> Enum.each(fn %{id: map_id, map_url: map_url} ->
        if map_id != main_map_id do
          broadcast!(map_url, :update_system, %{"payload" => system_info})
        end
      end)

      {systems, connections} = get_cached_data(map.id)

      updated_systems =
        systems
        |> Enum.map(fn system ->
          if system["solar_system_id"] == solar_system_id do
            Map.merge(system, system_info)
          else
            system
          end
        end)

      update_cache(map.id, updated_systems, connections)
    end

    state
  end

  def handle_event(
        %{
          event: :update_system,
          payload: %{"payload" => %{"solar_system_id" => solar_system_id} = _system}
        },
        %{map: map} = state
      ) do
    {:ok, main_map_id} = Cachex.get(:maps_shared_cache, "main")

    {:ok, existing_system} = get_map_existing_system(map.id, solar_system_id)

    if not is_nil(main_map_id) && map.id != main_map_id && not is_nil(existing_system) do
      # Use GenServer.call to get system from the main map
      WandererOps.Map.Server.get_system(main_map_id, solar_system_id)
      |> case do
        {:ok, system_info} when not is_nil(system_info) ->
          system_info =
            system_info
            |> Map.drop(["position_x", "position_y"])
            |> Map.put("update_existing", true)

          state
          |> upsert_map_systems_and_connections(%{
            systems: [system_info]
          })

          # Update cache after API upsert
          {systems, connections} = get_cached_data(map.id)
          update_cache(map.id, systems, connections)
          :ok

        _ ->
          :ok
      end
    end

    state
  end

  def handle_event(
        %{
          event: :deleted_system,
          payload: %{
            "payload" =>
              %{
                "solar_system_id" => solar_system_id
              } = _system
          }
        },
        %{map: map} = state
      ) do
    {:ok, main_map_id} = Cachex.get(:maps_shared_cache, "main")

    {systems, connections} = get_cached_data(map.id)

    updated_systems =
      systems
      |> Enum.reject(fn system -> system["solar_system_id"] == solar_system_id end)

    update_cache(map.id, updated_systems, connections)

    if not is_nil(main_map_id) && map.id == main_map_id do
      {:ok, maps} = WandererOps.Api.Map.read()

      maps
      |> Enum.each(fn %{id: map_id, map_url: map_url} ->
        if map_id != main_map_id do
          broadcast!(map_url, :remove_system, %{"payload" => solar_system_id})
        end
      end)
    end

    state
  end

  def handle_event(
        %{
          event: :remove_system,
          payload: %{"payload" => solar_system_id}
        },
        %{map: map} = state
      ) do
    ApiClient.remove_system(solar_system_id,
      map_url: map.map_url,
      api_key: map.public_api_key
    )
    |> case do
      :ok ->
        {systems, connections} = get_cached_data(map.id)

        updated_systems =
          systems
          |> Enum.reject(fn system -> system["solar_system_id"] == solar_system_id end)

        update_cache(map.id, updated_systems, connections)

      error ->
        Logger.error(error)
    end

    state
  end

  def handle_event(
        %{
          event: :connection_added,
          payload: %{
            "payload" =>
              %{
                "solar_system_source_id" => solar_system_source,
                "solar_system_target_id" => solar_system_target
              } = connection
          }
        },
        %{map: map} = state
      ) do
    {:ok, main_map_id} = Cachex.get(:maps_shared_cache, "main")

    {systems, connections} = get_cached_data(map.id)

    connection =
      connection
      |> normalize_connection_field("solar_system_source_id", "solar_system_source")
      |> normalize_connection_field("solar_system_target_id", "solar_system_target")

    update_cache(map.id, systems, [connection | connections])

    # if not is_nil(main_map_id) && map.id == main_map_id do
    #   # Call implementation directly to avoid self-calling GenServer
    #   get_connection(state, solar_system_source, solar_system_target)
    #   |> case do
    #     {:ok, connection_info} when not is_nil(connection_info) ->
    #       connection_info =
    #         connection_info
    #         |> Map.drop([
    #           "id",
    #           "inserted_at",
    #           "updated_at",
    #           "map_id"
    #         ])
    #         |> Map.put("update_existing", true)

    #       {:ok, maps} = WandererOps.Api.Map.read()

    #       maps
    #       |> Enum.each(fn %{id: map_id, map_url: map_url} ->
    #         if map_id != main_map_id do
    #           broadcast!(map_url, :add_connection, connection_info)
    #         end
    #       end)

    #       :ok

    #     _error ->
    #       :ok
    #   end
    # end

    state
  end

  def handle_event(
        %{
          event: :connection_updated,
          payload: %{
            "payload" =>
              %{
                "solar_system_source_id" => solar_system_source,
                "solar_system_target_id" => solar_system_target
              } = connection
          }
        },
        %{map: map} = state
      ) do
    {:ok, main_map_id} = Cachex.get(:maps_shared_cache, "main")

    {systems, connections} = get_cached_data(map.id)

    connection =
      connection
      |> normalize_connection_field("solar_system_source_id", "solar_system_source")
      |> normalize_connection_field("solar_system_target_id", "solar_system_target")

    update_cache(map.id, systems, [connection | connections])

    if not is_nil(main_map_id) && map.id == main_map_id do
      # Call implementation directly to avoid self-calling GenServer
      get_connection(state, solar_system_source, solar_system_target)
      |> case do
        {:ok, connection_info} when not is_nil(connection_info) ->
          connection_info =
            connection_info
            |> Map.drop([
              "id",
              "inserted_at",
              "updated_at",
              "map_id"
            ])
            |> Map.put("update_existing", true)

          {:ok, maps} = WandererOps.Api.Map.read()

          maps
          |> Enum.each(fn %{id: map_id, map_url: map_url} ->
            if map_id != main_map_id do
              broadcast!(map_url, :add_connection, connection_info)
            end
          end)

          :ok

        _error ->
          :ok
      end
    end

    state
  end

  def handle_event(
        %{
          event: :add_connection,
          payload: connection
        },
        %{map: map} = state
      ) do
    state
    |> upsert_map_systems_and_connections(%{
      connections: [connection]
    })

    {systems, connections} = get_cached_data(map.id)

    connection =
      connection
      |> normalize_connection_field("solar_system_source_id", "solar_system_source")
      |> normalize_connection_field("solar_system_target_id", "solar_system_target")

    update_cache(map.id, systems, [connection | connections])

    state
  end

  def handle_event(
        %{
          event: :connection_removed,
          payload: %{
            "payload" =>
              %{
                "solar_system_source_id" => solar_system_source,
                "solar_system_target_id" => solar_system_target
              } = payload
          }
        },
        %{map: map} = state
      ) do
    {:ok, main_map_id} = Cachex.get(:maps_shared_cache, "main")

    {systems, connections} = get_cached_data(map.id)

    updated_connections =
      connections
      |> Enum.reject(fn con ->
        (con["solar_system_source"] == solar_system_source &&
           con["solar_system_target"] == solar_system_target) ||
          (con["solar_system_source"] == solar_system_target &&
             con["solar_system_target"] == solar_system_source)
      end)

    update_cache(map.id, systems, updated_connections)

    if not is_nil(main_map_id) && map.id == main_map_id do
      {:ok, maps} = WandererOps.Api.Map.read()

      maps
      |> Enum.each(fn %{id: map_id, map_url: map_url} ->
        if map_id != main_map_id do
          broadcast!(map_url, :remove_connection, payload)
        end
      end)
    end

    state
  end

  def handle_event(
        %{
          event: :remove_connection,
          payload:
            %{
              "solar_system_source_id" => solar_system_source,
              "solar_system_target_id" => solar_system_target
            } = payload
        },
        %{map: map} = state
      ) do
    ApiClient.remove_connection(payload,
      map_url: map.map_url,
      api_key: map.public_api_key
    )
    |> case do
      :ok ->
        {systems, connections} = get_cached_data(map.id)

        updated_connections =
          connections
          |> Enum.reject(fn con ->
            (con["solar_system_source"] == solar_system_source &&
               con["solar_system_target"] == solar_system_target) ||
              (con["solar_system_source"] == solar_system_target &&
                 con["solar_system_target"] == solar_system_source)
          end)

        update_cache(map.id, systems, updated_connections)

      {:error, error} ->
        Logger.error(inspect(error))

      error ->
        Logger.error(inspect(error))
    end

    state
  end

  def handle_event(
        %{
          event: :border_systems_detected,
          payload: %{
            border_systems: system_ids
          }
        },
        %{map: map} = state
      ) do
    {:ok, main_map_id} = Cachex.get(:maps_shared_cache, "main")

    Logger.info(
      "Map #{map.id} received :border_systems_detected with #{length(system_ids)} systems: #{inspect(system_ids)}"
    )

    if map.id == main_map_id do
      Logger.info("Main map processing border systems, updating labels")
      {:ok, systems} = get_map_all_systems(map.id)

      # Track if any labels were updated
      labels_updated =
        systems
        |> Enum.reduce(false, fn sys, acc_updated ->
          updated =
            if sys["solar_system_id"] in system_ids do
              case get_system(state, sys["solar_system_id"]) do
                {:ok, %{"labels" => old_labels}} ->
                  updated_labels = get_updated_labels(old_labels)

                  if old_labels != updated_labels do
                    Logger.info(
                      "Adding 'c' label to system #{sys["solar_system_id"]} (#{sys["name"]})"
                    )

                    ApiClient.update_map_system(
                      sys["id"],
                      %{"labels" => updated_labels},
                      map_url: map.map_url,
                      api_key: map.public_api_key
                    )

                    true
                  else
                    false
                  end

                _ ->
                  Logger.error("Failed to get map system for map: #{map.map_url}")
                  false
              end
            else
              case get_system(state, sys["solar_system_id"]) do
                {:ok, %{"labels" => old_labels}} ->
                  updated_labels = get_labels_without_c(old_labels)

                  if old_labels != updated_labels do
                    Logger.info(
                      "Removing 'c' label from system #{sys["solar_system_id"]} (#{sys["name"]})"
                    )

                    ApiClient.update_map_system(
                      sys["id"],
                      %{"labels" => updated_labels},
                      map_url: map.map_url,
                      api_key: map.public_api_key
                    )

                    true
                  else
                    false
                  end

                _ ->
                  Logger.error("Failed to get map system for map: #{map.map_url}")
                  false
              end
            end

          acc_updated || updated
        end)

      # If labels were updated, refresh cache from API to get the latest data
      if labels_updated do
        Logger.info("Labels updated, refreshing cache from API")
        refresh_map_data_from_api(map)
      end
    end

    state
  end

  def handle_event(msg, state) do
    Logger.warning("Unhandled event: #{inspect(msg)} #{inspect(state)}")

    state
  end

  defp normalize_connection_field(conn, old_key, new_key) do
    case Map.get(conn, old_key) do
      nil ->
        # Already has new key or doesn't have either
        conn

      value ->
        # Has old key, rename it
        conn
        |> Map.put(new_key, value)
        |> Map.delete(old_key)
    end
  end

  defp get_map_all_systems(map_id) do
    case Cachex.get(:maps_all_data_cache, map_id) do
      {:ok, %{"systems" => systems}} when not is_nil(systems) ->
        {:ok, systems}

      _ ->
        {:ok, []}
    end
  end

  defp get_map_existing_system(map_id, solar_system_id) do
    case get_map_all_systems(map_id) do
      {:ok, systems} ->
        {:ok, systems |> Enum.find(fn sys -> sys["solar_system_id"] == solar_system_id end)}

      _ ->
        {:ok, nil}
    end
  end

  defp get_updated_labels(nil), do: %{"customLabel" => "", "labels" => ["c"]} |> Jason.encode!()

  defp get_updated_labels(val) do
    {:ok, %{"labels" => labels} = labels_struct} = Jason.decode(val)

    if "c" in labels do
      val
    else
      labels_struct
      |> Map.put("labels", labels ++ ["c"])
      |> Jason.encode!()
    end
  end

  defp get_labels_without_c(nil), do: nil

  defp get_labels_without_c(val) do
    {:ok, %{"labels" => labels} = labels_struct} = Jason.decode(val)

    if "c" in labels do
      labels_struct
      |> Map.put("labels", labels |> Enum.reject(fn l -> l == "c" end))
      |> Jason.encode!()
    else
      val
    end
  end

  # Gets systems and connections from cache
  defp get_cached_data(map_id) do
    case Cachex.get(:maps_all_data_cache, map_id) do
      {:ok, %{"systems" => systems, "connections" => connections}} ->
        {systems, connections}

      _ ->
        {[], []}
    end
  end

  # Updates cache with given systems and connections
  defp update_cache(map_id, systems, connections) do
    data = %{
      "systems" => systems,
      "connections" => connections
    }

    # Update all data cache
    Cachex.put(
      :maps_all_data_cache,
      map_id,
      data
    )

    # Update filtered data cache
    {:ok, filtered_data} =
      WandererOps.Map.Utils.filter_connected(map_id, systems, connections)

    Cachex.put(
      :maps_cache,
      map_id,
      filtered_data
    )

    # Broadcast data update event
    Logger.info(
      "Broadcasting :data_updated for map #{map_id}, systems: #{length(systems)}, connections: #{length(connections)}"
    )

    broadcast!(map_id, :data_updated, %{})

    :ok
  end

  # Always refreshes map data from API (used by the 30-minute timer)
  defp refresh_map_data_from_api(map) do
    case ApiClient.get_map_systems(map.map_url, map.public_api_key) do
      {:ok, %{"data" => data}} ->
        update_cache(map.id, data["systems"], data["connections"])
        {:ok, :refreshed}

      error ->
        Logger.error("Failed to load map data. Try to restart server. #{inspect(error)}")
        {:error, error}
    end
  end

  def broadcast!(map_url, event, payload \\ nil) do
    @pubsub_client.broadcast!(WandererOps.PubSub, map_url, %{event: event, payload: payload})

    :ok
  end

  def get_update_map(update, attributes),
    do:
      {:ok,
       Enum.reduce(attributes, Map.new(), fn attribute, map ->
         map |> Map.put_new(attribute, get_in(update, [Access.key(attribute)]))
       end)}
end

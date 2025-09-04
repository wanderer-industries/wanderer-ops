defmodule WandererOps.Map.Utils do
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
end

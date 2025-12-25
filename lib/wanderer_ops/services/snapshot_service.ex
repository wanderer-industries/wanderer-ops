defmodule WandererOps.Services.SnapshotService do
  @moduledoc """
  Service for creating and managing dashboard snapshots.
  Captures the current state of all maps, systems, and connections for point-in-time sharing.
  """

  require Logger

  @doc """
  Captures current dashboard state as a snapshot.
  Returns a map suitable for storing in snapshot_data column.
  """
  @spec capture_snapshot() :: {:ok, map()} | {:error, term()}
  def capture_snapshot do
    with {:ok, maps} <- WandererOps.Api.Map.read(),
         {:ok, map_cached_data} <- WandererOps.Map.Utils.prepare_cached_data(maps) do
      snapshot = %{
        "maps" => Enum.map(maps, &format_map_for_snapshot/1),
        "map_cached_data" => map_cached_data
      }

      Logger.info("Captured dashboard snapshot with #{length(maps)} maps")

      {:ok, snapshot}
    else
      {:error, reason} = error ->
        Logger.error("Failed to capture snapshot: #{inspect(reason)}")
        error
    end
  end

  defp format_map_for_snapshot(map) do
    {:ok, started} = Cachex.get(:maps_cache, "#{map.id}:started")

    %{
      "id" => map.id,
      "title" => map.title,
      "color" => map.color,
      "is_main" => map.is_main,
      "main_system_eve_id" => map.main_system_eve_id,
      "started" => started
    }
  end
end

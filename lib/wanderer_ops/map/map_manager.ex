defmodule WandererOps.Map.Manager do
  @moduledoc """
  Manager maps with no active characters and bulk start
  """

  use GenServer

  require Logger

  alias WandererOps.Map.Server
  alias WandererOps.Map.ServerSupervisor

  @maps_start_per_second 5
  @maps_start_interval 1000
  @maps_queue :maps_queue
  @garbage_collection_interval :timer.hours(1)
  @check_maps_queue_interval :timer.seconds(1)

  # def start_map(map_id) when is_binary(map_id),
  #   do: WandererOps.Queue.push_uniq(@maps_queue, map_id)

  def stop_map(map_id) when is_binary(map_id) do
    case Server.map_pid(map_id) do
      pid when is_pid(pid) ->
        GenServer.cast(
          pid,
          :stop
        )

      nil ->
        :ok
    end
  end

  def start_link(_), do: GenServer.start(__MODULE__, [], name: __MODULE__)

  @impl true
  def init([]) do
    try do
      Task.async(fn ->
        start_active_maps()
      end)
    rescue
      e ->
        Logger.error(Exception.message(e))
    end

    {:ok, %{}}
  end

  def handle_info({ref, _result}, state) do
    Process.demonitor(ref, [:flush])

    {:noreply, state}
  end

  defp start_active_maps() do
    {:ok, maps} = WandererOps.Api.Map.read()

    maps
    |> Enum.each(fn %{id: map_id} -> start_map_server(map_id) end)

    :ok
  end

  defp start_map_server(map_id) do
    case DynamicSupervisor.start_child(
           {:via, PartitionSupervisor, {WandererOps.Map.DynamicSupervisors, self()}},
           {ServerSupervisor, map_id: map_id}
         ) do
      {:ok, pid} ->
        {:ok, pid}

      {:error, {:already_started, pid}} ->
        Logger.error("Error starting map server already_started")
        {:ok, pid}

      {:error, {:shutdown, {:failed_to_start_child, Server, {:already_started, pid}}}} ->
        Logger.error("Error starting map server already_started")
        {:ok, pid}

      {:error, reason} ->
        Logger.error("Error starting map server #{inspect(reason)}")
        {:error, reason}
    end
  end
end

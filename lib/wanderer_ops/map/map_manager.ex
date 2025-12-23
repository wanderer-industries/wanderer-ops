defmodule WandererOps.Map.Manager do
  @moduledoc """
  Manager maps with no active characters and bulk start
  """

  use GenServer

  require Logger

  alias WandererOps.Map.Server
  alias WandererOps.Map.MapSupervisor

  @maps_start_per_second 5
  @maps_start_interval 1000
  @maps_queue :maps_queue
  @garbage_collection_interval :timer.hours(1)
  @check_maps_queue_interval :timer.seconds(1)

  def start_map(map_id) when is_binary(map_id),
    do: start_map_server(map_id)

  def stop_map(map_id) when is_binary(map_id) do
    Logger.info("Attempting to stop map: #{map_id}")

    case GenServer.whereis({:via, Registry, {WandererOps.MapRegistry, {:map_supervisor, map_id}}}) do
      pid when is_pid(pid) ->
        Logger.info("Found MapSupervisor pid: #{inspect(pid)}, terminating...")

        # Get the supervisor that owns this child
        case :supervisor.which_children(
               {:via, Registry, {WandererOps.MapRegistry, {:map_supervisor, map_id}}}
             ) do
          children when is_list(children) ->
            # This is a supervisor, we need to find its parent DynamicSupervisor
            # and terminate it from there
            case find_dynamic_supervisor(pid) do
              {:ok, dynamic_sup} ->
                result = DynamicSupervisor.terminate_child(dynamic_sup, pid)
                Logger.info("Terminate result: #{inspect(result)}")
                result

              :error ->
                # Fallback: just stop the supervisor directly
                Logger.info("Could not find parent DynamicSupervisor, stopping directly")
                Supervisor.stop(pid, :normal)
                :ok
            end

          _ ->
            Logger.info("Could not inspect supervisor, stopping directly")
            Supervisor.stop(pid, :normal)
            :ok
        end

      nil ->
        Logger.warning("MapSupervisor not found for map_id: #{map_id}")
        :ok
    end
  end

  defp find_dynamic_supervisor(child_pid) do
    # Try each partition to find which one owns this child
    partitions = PartitionSupervisor.partitions(WandererOps.Map.DynamicSupervisors)

    Enum.reduce_while(0..(partitions - 1), :error, fn partition, _acc ->
      dynamic_sup = {:via, PartitionSupervisor, {WandererOps.Map.DynamicSupervisors, partition}}

      case DynamicSupervisor.which_children(dynamic_sup) do
        children when is_list(children) ->
          if Enum.any?(children, fn {_, pid, _, _} -> pid == child_pid end) do
            {:halt, {:ok, dynamic_sup}}
          else
            {:cont, :error}
          end

        _ ->
          {:cont, :error}
      end
    end)
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
           {MapSupervisor, map_id: map_id}
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

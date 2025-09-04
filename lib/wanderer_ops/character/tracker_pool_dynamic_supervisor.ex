defmodule WandererOps.Character.TrackerPoolDynamicSupervisor do
  @moduledoc false
  use DynamicSupervisor

  require Logger

  @cache :tracked_characters
  @registry :tracker_pool_registry
  @unique_registry :unique_tracker_pool_registry
  @tracker_pool_limit 2

  @name __MODULE__

  def start_link(_arg) do
    DynamicSupervisor.start_link(@name, [], name: @name, max_restarts: 10)
  end

  def init(_arg) do
    Cachex.put(@cache, :tracked_characters, [])
    DynamicSupervisor.init(strategy: :one_for_one)
  end

  def autostart() do
  end

  def start_tracking(tracked_id) do
    if is_not_tracked?(tracked_id) do
      maybe_start_new_pool(tracked_id)
    else
      :ok
    end
  end

  def stop_tracking(tracked_id) do
    if not is_not_tracked?(tracked_id) do
      {:ok, uuid} = Cachex.get(@cache, tracked_id)

      case Registry.lookup(
             @unique_registry,
             Module.concat(WandererOps.Character.TrackerPool, uuid)
           ) do
        [] ->
          :ok

        [{pool_pid, _}] ->
          # IO.inspect(pool_pid)
          GenServer.cast(pool_pid, {:remove_tracked_id, tracked_id})
      end
    else
      :ok
    end
  end

  def maybe_start_new_pool(tracked_id) do
    case Registry.lookup(@registry, WandererOps.Character.TrackerPool) do
      [] ->
        start_pool([tracked_id])

      pools ->
        # IO.inspect(pools)

        case get_available_pool(pools) do
          nil ->
            start_pool([tracked_id])

          pid ->
            GenServer.cast(pid, {:add_tracked_id, tracked_id})
        end
    end
  end

  def is_not_tracked?(tracked_id) do
    {:ok, tracked_ids} = Cachex.get(@cache, :tracked_characters)
    tracked_ids |> Enum.member?(tracked_id) |> Kernel.not()
  end

  def get_available_pool([]), do: nil

  def get_available_pool([{pid, uuid} | pools]) do
    case Registry.lookup(@unique_registry, Module.concat(WandererOps.Character.TrackerPool, uuid)) do
      [] ->
        nil

      uuid_pools ->
        # IO.inspect(uuid_pools)

        case get_available_pool_pid(uuid_pools) do
          nil ->
            get_available_pool(pools)

          pid ->
            pid
        end
    end
  end

  def get_available_pool_pid([]), do: nil

  def get_available_pool_pid([{pid, tracked_ids} | pools]) do
    if Enum.count(tracked_ids) < @tracker_pool_limit do
      pid
    else
      get_available_pool_pid(pools)
    end
  end

  def start_pool(tracked_ids) do
    Logger.info("Starting tracker for #{inspect(tracked_ids)}")
    start_child(tracked_ids)
  end

  def stop_pool(tracked_ids) do
    Logger.info("Stopping tracker for #{inspect(tracked_ids)}")
    stop_child(tracked_ids)
  end

  defp start_child(tracked_ids) do
    case DynamicSupervisor.start_child(@name, {WandererOps.Character.TrackerPool, tracked_ids}) do
      {:ok, pid} ->
        Logger.info("Starting new pool for #{inspect(tracked_ids)}")
        {:ok, pid}

      {:error, {:already_started, pid}} ->
        Logger.info("Pools already started for #{inspect(tracked_ids)}")
        {:ok, pid}
    end
  end

  defp stop_child(topic) do
    case Registry.lookup(@registry, topic) do
      [{pid, _}] ->
        GenServer.cast(pid, :stop)

      _ ->
        Logger.warn("Unable to locate tracker assigned to #{inspect(topic)}")
        :ok
    end
  end
end

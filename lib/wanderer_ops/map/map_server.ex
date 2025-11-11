defmodule WandererOps.Map.Server do
  @moduledoc """
  Holds state for a map and exposes an interface to managing the map instance
  """
  use GenServer, restart: :transient, significant: true

  require Logger

  alias WandererOps.Map.Server.Impl

  @spec start_link(keyword()) :: GenServer.on_start()
  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: via(opts[:map_id]))
  end

  @impl true
  def init(args) do
    Process.flag(:trap_exit, true)
    {:ok, Impl.init(args), {:continue, :load_state}}
  end

  def map_pid(map_id),
    do:
      map_id
      |> via()
      |> GenServer.whereis()

  def map_pid!(map_id) do
    map_id
    |> map_pid()
    |> case do
      map_id when is_pid(map_id) ->
        map_id

      nil ->
        # WandererApp.Cache.insert("map_#{map_id}:started", false)
        throw("Map server not started")
    end
  end

  def get_map(pid) when is_pid(pid),
    do:
      pid
      |> GenServer.call({&Impl.get_map/1, []}, :timer.minutes(5))

  def get_map(map_id) when is_binary(map_id),
    do:
      map_id
      |> map_pid!
      |> get_map()

  def get_system(map_id, solar_system_id) when is_binary(map_id),
    do:
      map_id
      |> map_pid!
      |> GenServer.call({&Impl.get_system/2, [solar_system_id]}, :timer.minutes(2))

  def get_connection(map_id, solar_system_source_id, solar_system_target_id)
      when is_binary(map_id),
      do:
        map_id
        |> map_pid!
        |> GenServer.call(
          {&Impl.get_connection/3, [solar_system_source_id, solar_system_target_id]},
          :timer.minutes(2)
        )

  def upsert_map_systems_and_connections(map_id, update) when is_binary(map_id),
    do:
      map_id
      |> map_pid!
      |> GenServer.cast({&Impl.upsert_map_systems_and_connections/2, [update]})

  # def add_system(map_id, system_info, user_id, character_id) when is_binary(map_id),
  #   do:
  #     map_id
  #     |> map_pid!
  #     |> GenServer.cast({&Impl.add_system/4, [system_info, user_id, character_id]})

  # def delete_systems(map_id, solar_system_ids, user_id, character_id) when is_binary(map_id),
  #   do:
  #     map_id
  #     |> map_pid!
  #     |> GenServer.cast({&Impl.delete_systems/4, [solar_system_ids, user_id, character_id]})

  # def add_connection(map_id, connection_info) when is_binary(map_id),
  #   do:
  #     map_id
  #     |> map_pid!
  #     |> GenServer.cast({&Impl.add_connection/2, [connection_info]})

  # def delete_connection(map_id, connection_info) when is_binary(map_id),
  #   do:
  #     map_id
  #     |> map_pid!
  #     |> GenServer.cast({&Impl.delete_connection/2, [connection_info]})

  # def update_connection_type(map_id, connection_info) when is_binary(map_id),
  #   do:
  #     map_id
  #     |> map_pid!
  #     |> GenServer.cast({&Impl.update_connection_type/2, [connection_info]})

  @impl true
  def handle_continue(:load_state, state),
    do: {:noreply, state |> Impl.load_state(), {:continue, :start_map}}

  @impl true
  def handle_continue(:start_map, state), do: {:noreply, state |> Impl.start_map()}

  @impl true
  def handle_call(
        {impl_function, args},
        _from,
        state
      )
      when is_function(impl_function),
      do: WandererOps.GenImpl.apply_call(impl_function, state, args)

  @impl true
  def handle_cast(:stop, state), do: {:stop, :normal, state |> Impl.stop_map()}

  @impl true
  def handle_cast({impl_function, args}, state)
      when is_function(impl_function) do
    case WandererOps.GenImpl.apply_call(impl_function, state, args) do
      {:reply, _return, updated_state} ->
        {:noreply, updated_state}

      _ ->
        {:noreply, state}
    end
  end

  @impl true
  def handle_info(:stop, state), do: {:stop, :normal, state |> Impl.stop_map()}

  @impl true
  def handle_info(event, state), do: {:noreply, Impl.handle_event(event, state)}

  @impl true
  def terminate(reason, state) do
    Logger.info("MapServer terminate/2 called with reason: #{inspect(reason)}")
    Impl.stop_map(state)
  end

  defp via(map_id), do: {:via, Registry, {WandererOps.MapRegistry, {:map_server, map_id}}}
end

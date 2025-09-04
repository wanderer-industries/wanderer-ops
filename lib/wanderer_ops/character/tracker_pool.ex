defmodule WandererOps.Character.TrackerPool do
  @moduledoc false
  use GenServer, restart: :transient

  require Logger

  defstruct [:tracked_ids, :uuid]

  @name __MODULE__
  @cache :tracked_characters
  @registry :tracker_pool_registry
  @unique_registry :unique_tracker_pool_registry

  def start_link(tracked_ids) do
    uuid = UUID.uuid1()

    GenServer.start_link(
      @name,
      {uuid, tracked_ids},
      name: Module.concat(__MODULE__, uuid)
    )
  end

  @impl true
  def init({uuid, tracked_ids}) do
    Logger.info("#{@name} starting")
    # IO.inspect(tracked_ids)

    {:ok, _} = Registry.register(@unique_registry, Module.concat(__MODULE__, uuid), tracked_ids)
    {:ok, _} = Registry.register(@registry, __MODULE__, uuid)

    Cachex.get_and_update(@cache, :tracked_characters, fn ids ->
      {:commit, ids ++ tracked_ids}
    end)

    tracked_ids
    |> Enum.each(fn id -> Cachex.put(@cache, id, uuid) end)

    state = %__MODULE__{
      uuid: uuid,
      tracked_ids: tracked_ids
    }

    {:ok, state, {:continue, :start}}
  end

  @impl true
  def terminate(_reason, _state) do
    :ok
  end

  @impl true
  def handle_cast(:stop, state), do: {:stop, :normal, state}

  @impl true
  def handle_cast({:add_tracked_id, tracked_id}, %{tracked_ids: tracked_ids, uuid: uuid} = state) do
    Logger.info("#{@name} add_tracked_id #{tracked_id}")

    Registry.update_value(@unique_registry, Module.concat(__MODULE__, uuid), fn r_tracked_ids ->
      [tracked_id | r_tracked_ids]
    end)

    Cachex.get_and_update(@cache, :tracked_characters, fn ids ->
      {:commit, ids ++ [tracked_id]}
    end)

    Cachex.put(@cache, tracked_id, uuid)

    {:noreply, %{state | tracked_ids: [tracked_id | tracked_ids]}}
  end

  @impl true
  def handle_cast(
        {:remove_tracked_id, tracked_id},
        %{tracked_ids: tracked_ids, uuid: uuid} = state
      ) do
    Logger.info("#{@name} remove_tracked_id #{tracked_id}")

    Registry.update_value(@unique_registry, Module.concat(__MODULE__, uuid), fn r_tracked_ids ->
      r_tracked_ids |> Enum.reject(fn id -> id == tracked_id end)
    end)

    Cachex.get_and_update(@cache, :tracked_characters, fn ids ->
      {:commit, ids |> Enum.reject(fn id -> id == tracked_id end)}
    end)

    Cachex.del(@cache, tracked_id)

    {:noreply, %{state | tracked_ids: tracked_ids |> Enum.reject(fn id -> id == tracked_id end)}}
  end

  @impl true
  def handle_call(:error, _, state), do: {:stop, :error, :ok, state}

  @impl true
  def handle_continue(:start, state) do
    Logger.info("#{@name} started")
    {:noreply, state}
  end

  defp via_tuple(uuid) do
    {:via, Registry, {@unique_registry, Module.concat(__MODULE__, uuid)}}
  end
end

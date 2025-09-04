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
    map_opts: []
  ]

  @pubsub_client Application.compile_env(:wanderer_ops, :pubsub_client)
  @refresh_data_timeout :timer.seconds(5)

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
        %{state | map: map}

      _ ->
        Logger.error("Failed to load map data. Try to restart server.")
        state
    end
  end

  def start_map(%__MODULE__{map: map, map_id: map_id} = state) do
    Logger.warning(fn -> "Started map server for #{map_id}" end)
    Process.send_after(self(), :refresh_data, 100)
    state
  end

  def stop_map(%{map_id: map_id} = state) do
    Logger.warning(fn -> "Stopping map server for #{map_id}" end)

    # WandererApp.Cache.delete("map_#{map_id}:started")

    # :telemetry.execute([:wanderer_app, :map, :stopped], %{count: 1})

    state
  end

  def get_map(%{map: map} = _state), do: {:ok, map}

  def handle_event(:refresh_data, %{map: map} = state) do
    Process.send_after(self(), :refresh_data, @refresh_data_timeout)
    refresh_map_data(map)

    state
  end

  def handle_event({ref, _result}, %{map_id: _map_id} = state) when is_reference(ref) do
    Process.demonitor(ref, [:flush])

    state
  end

  def handle_event(msg, state) do
    Logger.warning("Unhandled event: #{inspect(msg)} #{inspect(state)}")

    state
  end

  defp refresh_map_data(map) do
    case ApiClient.get_map_systems(map.map_url, map.public_api_key) do
      {:ok, %{"data" => data}} ->
        {:ok, filtered_data} =
          WandererOps.Map.Utils.filter_connected(map.id, data["systems"], data["connections"])

        Cachex.put(
          :maps_cache,
          map.id,
          filtered_data
        )

        broadcast!(map.id, :data_updated, %{})

      error ->
        Logger.error("Failed to load map data. Try to restart server. #{inspect(error)}")
    end
  end

  def broadcast!(map_id, event, payload \\ nil) do
    @pubsub_client.broadcast!(WandererOps.PubSub, map_id, %{event: event, payload: payload})

    :ok
  end

  def get_update_map(update, attributes),
    do:
      {:ok,
       Enum.reduce(attributes, Map.new(), fn attribute, map ->
         map |> Map.put_new(attribute, get_in(update, [Access.key(attribute)]))
       end)}
end

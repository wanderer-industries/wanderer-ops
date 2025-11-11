defmodule WandererOps.Map.SSEClient do
  @moduledoc """
  Server-Sent Events client for Wanderer map real-time events.

  Connects to the Wanderer SSE endpoint and processes map events in real-time,
  replacing the polling-based system update mechanism.
  """

  use GenServer, restart: :transient, significant: true
  require Logger

  alias WandererOps.Map.EventProcessor
  alias WandererOps.Map.SSEParser
  alias WandererOps.Map.SSEConnection
  alias WandererOps.Infrastructure.Messaging.ConnectionMonitor
  alias WandererOps.Shared.Utils.Retry
  alias WandererOps.Shared.Config

  @type state :: %{
          map_url: String.t(),
          api_token: String.t(),
          connection: pid() | nil,
          last_event_id: String.t() | nil,
          reconnect_attempts: integer(),
          reconnect_timer: reference() | nil,
          events_filter: list(String.t()),
          status: :disconnected | :connecting | :connected | :reconnecting
        }

  @default_events [
    "add_system",
    "deleted_system",
    "connection_added",
    "connection_removed",
    "connection_updated",
    "system_metadata_changed"
  ]
  @initial_reconnect_delay 1000
  @max_reconnect_delay 30_000

  # Client API

  @doc """
  Starts the SSE client for a specific map.

  ## Options
  - `:map_id` - The map ID for the SSE endpoint
  - `:map_slug` - The map slug for logging and identification
  - `:api_token` - Authentication token for the map API
  - `:events` - List of event types to subscribe to (optional)
  """
  @spec start_link(keyword()) :: GenServer.on_start()
  def start_link(opts) do
    map_id = opts[:map_id]
    name = via_tuple(map_id)
    GenServer.start_link(__MODULE__, opts, name: name)
  end

  @doc """
  Gets the current connection status.
  """
  @spec get_status(String.t()) :: :disconnected | :connecting | :connected | :reconnecting
  def get_status(map_slug) do
    map_slug
    |> via_tuple()
    |> GenServer.call(:get_status)
  end

  @doc """
  Manually triggers a reconnection attempt.
  """
  @spec reconnect(String.t()) :: :ok
  def reconnect(map_slug) do
    map_slug
    |> via_tuple()
    |> GenServer.cast(:reconnect)
  end

  @doc """
  Stops the SSE client.
  """
  @spec stop(String.t()) :: :ok
  def stop(map_slug) do
    map_slug
    |> via_tuple()
    |> GenServer.stop()
  end

  @doc """
  Gets connection health metrics.
  """
  @spec get_health_metrics(String.t()) :: map()
  def get_health_metrics(map_slug) do
    map_slug
    |> via_tuple()
    |> GenServer.call(:get_health_metrics)
  end

  # GenServer Implementation

  @impl GenServer
  def init(opts) do
    map_id = opts[:map_id]

    case WandererOps.Api.Map.by_id(map_id) do
      {:ok, map} ->
        map_url = map.map_url
        api_token = map.public_api_key
        # If events is not provided, use default events for filtering
        events = Keyword.get(opts, :events, @default_events)

        Logger.info(
          "SSE client init - map_url: #{map_url}, opts: #{inspect(opts)}, events: #{inspect(events)}, default_events: #{inspect(@default_events)}"
        )

        state = %{
          map_url: map_url,
          api_token: api_token,
          connection: nil,
          last_event_id: nil,
          reconnect_attempts: 0,
          reconnect_timer: nil,
          events_filter: events,
          status: :disconnected,
          connection_id: nil
        }

        Logger.info(
          "SSE client initialized with events: #{inspect(state.events_filter)} - map_url: #{map_url}"
        )

        # Start connection immediately
        {:ok, state, {:continue, :connect}}

      _ ->
        Logger.error("Failed to load map data. Try to restart server.")
        {:stop, :normal, %{}}
    end
  end

  @impl GenServer
  def handle_continue(:connect, %{map_url: map_url, events_filter: events_filter} = state) do
    # Generate connection ID for monitoring
    connection_id = "sse_map_#{map_url}_#{:erlang.phash2(self())}"

    case do_connect(state) do
      {:ok, connection} ->
        # Register with ConnectionMonitor
        ConnectionMonitor.register_connection(connection_id, :sse, %{
          map_slug: map_url,
          events_filter: events_filter,
          pid: self()
        })

        ConnectionMonitor.update_connection_status(connection_id, :connected)

        new_state = %{
          state
          | connection: connection,
            status: :connected,
            reconnect_attempts: 0,
            connection_id: connection_id
        }

        Logger.debug("[SSE] Connected: #{map_url}")
        {:noreply, new_state}

      {:error, reason} ->
        Logger.error("SSE connection attempt failed",
          map_slug: map_url,
          error: inspect(reason),
          error_type:
            case reason do
              {:connection_failed, inner} -> "connection_failed: #{inspect(inner)}"
            end,
          attempt: state.reconnect_attempts + 1
        )

        # Register failed connection with ConnectionMonitor
        ConnectionMonitor.register_connection(connection_id, :sse, %{
          map_slug: map_url,
          events_filter: state.events_filter,
          pid: self()
        })

        ConnectionMonitor.update_connection_status(connection_id, :failed)

        new_state = schedule_reconnect(%{state | connection_id: connection_id})
        {:noreply, new_state}
    end
  end

  @impl GenServer
  def handle_call(:get_status, _from, state) do
    {:reply, state.status, state}
  end

  @impl GenServer
  def handle_call(:get_health_metrics, _from, state) do
    metrics = %{
      status: state.status,
      reconnect_attempts: state.reconnect_attempts,
      has_connection: state.connection != nil,
      last_event_id: state.last_event_id,
      events_filter: state.events_filter,
      config: %{
        recv_timeout: Config.sse_recv_timeout(),
        connect_timeout: Config.sse_connect_timeout(),
        keepalive_interval: Config.sse_keepalive_interval()
      }
    }

    {:reply, metrics, state}
  end

  @impl GenServer
  def handle_cast(:reconnect, state) do
    # Cancel existing reconnect timer
    if state.reconnect_timer, do: Process.cancel_timer(state.reconnect_timer)

    # Close existing connection
    if state.connection, do: close_connection(state.connection)

    new_state = %{state | connection: nil, reconnect_timer: nil, status: :connecting}

    {:noreply, new_state, {:continue, :connect}}
  end

  @impl GenServer
  def handle_info({:sse_event, event_data}, state) do
    case process_event(event_data, state) do
      {:ok, last_event_id} ->
        new_state = %{state | last_event_id: last_event_id}
        {:noreply, new_state}

      {:error, reason} ->
        Logger.error(
          "Event processing failed - map_slug: #{state.map_slug}, error: #{inspect(reason)}"
        )

        {:noreply, state}
    end
  end

  @impl GenServer
  def handle_info({:sse_error, reason}, state) do
    Logger.error("SSE stream error",
      map_slug: state.map_slug,
      error: inspect(reason),
      connection_active: state.connection != nil
    )

    # Close connection and schedule reconnect
    if state.connection, do: close_connection(state.connection)

    new_state = %{state | connection: nil}
    new_state = schedule_reconnect(new_state)

    {:noreply, new_state}
  end

  @impl GenServer
  def handle_info({:sse_closed}, state) do
    Logger.info("SSE connection closed",
      map_slug: state.map_slug,
      reconnect_attempts: state.reconnect_attempts
    )

    new_state = %{state | connection: nil}
    new_state = schedule_reconnect(new_state)

    {:noreply, new_state}
  end

  @impl GenServer
  def handle_info(:reconnect_timer, state) do
    # Update connection status to reconnecting
    if state.connection_id do
      ConnectionMonitor.update_connection_status(state.connection_id, :reconnecting)
    end

    new_state = %{state | reconnect_timer: nil, status: :reconnecting}
    {:noreply, new_state, {:continue, :connect}}
  end

  @impl GenServer
  def handle_info(%HTTPoison.AsyncStatus{code: status_code, id: async_id}, state) do
    Logger.info("SSE connection status received",
      map_url: state.map_url,
      status_code: status_code,
      async_id: async_id
    )

    if status_code == 200 do
      # Connection successful, continue streaming
      Logger.info("SSE connection established successfully",
        map_url: state.map_url
      )

      # Create the AsyncResponse struct that stream_next expects
      async_response = %HTTPoison.AsyncResponse{id: async_id}
      HTTPoison.stream_next(async_response)
      {:noreply, state}
    else
      # Connection failed
      Logger.error(
        "SSE connection failed - map_url: #{state.map_url}, status_code: #{status_code}"
      )

      new_state = schedule_reconnect(state)
      {:noreply, new_state}
    end
  end

  @impl GenServer
  def handle_info(%HTTPoison.AsyncHeaders{headers: headers, id: async_id}, state) do
    Logger.debug(
      "SSE connection headers received - map_url: #{state.map_url}, headers: #{inspect(headers)}"
    )

    # Continue streaming
    async_response = %HTTPoison.AsyncResponse{id: async_id}
    HTTPoison.stream_next(async_response)
    {:noreply, state}
  end

  @impl GenServer
  def handle_info(%HTTPoison.AsyncChunk{chunk: chunk, id: async_id}, state) do
    # Process SSE chunk
    case SSEParser.parse_chunk(chunk) do
      {:ok, events} ->
        log_sse_events(events, chunk, state.map_url)
        process_sse_events(events, state, async_id)

      {:error, reason} ->
        Logger.error(
          "Failed to parse SSE chunk - map_url: #{state.map_url}, error: #{inspect(reason)}, chunk: #{inspect(chunk)}"
        )

        # Continue streaming despite parse error
        async_response = %HTTPoison.AsyncResponse{id: async_id}
        HTTPoison.stream_next(async_response)
        {:noreply, state}
    end
  end

  @impl GenServer
  def handle_info(%HTTPoison.AsyncEnd{id: async_id}, state) do
    Logger.info("SSE connection ended (server closed)",
      map_url: state.map_url,
      async_id: async_id,
      was_connected: state.status == :connected
    )

    # Connection ended, schedule reconnect
    new_state = %{state | connection: nil}
    new_state = schedule_reconnect(new_state)
    {:noreply, new_state}
  end

  @impl GenServer
  def handle_info(%HTTPoison.Error{reason: reason}, state) do
    Logger.error("SSE HTTP error received",
      map_url: state.map_url,
      error: inspect(reason),
      error_type: elem(reason, 0) |> to_string() |> String.replace("_", " ")
    )

    # Connection error, schedule reconnect
    new_state = %{state | connection: nil}
    new_state = schedule_reconnect(new_state)
    {:noreply, new_state}
  end

  @impl GenServer
  def terminate(_reason, state) do
    if state.connection, do: close_connection(state.connection)
    if state.reconnect_timer, do: Process.cancel_timer(state.reconnect_timer)
    :ok
  end

  # Private Functions

  defp via_tuple(map_id) do
    {:via, Registry, {WandererOps.MapRegistry, {:sse_client, map_id}}}
  end

  defp do_connect(state) do
    Logger.info("Attempting SSE connection",
      map_url: state.map_url,
      events_filter: inspect(state.events_filter),
      has_last_event_id: state.last_event_id != nil,
      attempt: state.reconnect_attempts + 1
    )

    SSEConnection.connect(
      state.map_url,
      state.api_token,
      state.events_filter,
      state.last_event_id
    )
  end

  defp close_connection(connection) do
    SSEConnection.close(connection)
  end

  defp process_event(event_data, state) do
    with {:ok, parsed_event} <- parse_event(event_data),
         {:ok, validated_event} <- validate_event(parsed_event) do
      process_validated_event(validated_event, state)
    else
      {:error, reason} ->
        {:error, reason}
    end
  end

  defp process_validated_event(validated_event, state) do
    # Skip Integration processing - it has redundant deduplication
    # Go directly to legacy processing which has proper domain-specific deduplication
    process_legacy_only(validated_event, state)
  end

  defp process_legacy_only(validated_event, state) do
    case EventProcessor.process_event(validated_event, state.map_url) do
      :ok -> extract_event_id(validated_event)
      error -> error
    end
  end

  defp extract_event_id(validated_event) do
    event_id = Map.get(validated_event, "id")
    {:ok, event_id}
  end

  defp parse_event(event_data) when is_binary(event_data) do
    case Jason.decode(event_data) do
      {:ok, parsed} -> {:ok, parsed}
      {:error, _} -> {:error, :json_decode_error}
    end
  end

  defp parse_event(event_data) when is_map(event_data) do
    {:ok, event_data}
  end

  defp parse_event(_), do: {:error, :invalid_event_data}

  defp validate_event(event) when is_map(event) do
    event_type = Map.get(event, "type")

    case event_type do
      "connected" ->
        # Connection events have different structure
        required_fields = ["id", "type", "map_id", "server_time"]
        validate_event_fields(event, required_fields)

      _ ->
        # Regular events require payload and timestamp
        required_fields = ["id", "type", "map_id", "timestamp", "payload"]
        validate_event_fields(event, required_fields)
    end
  end

  defp validate_event(_), do: {:error, :invalid_event_structure}

  defp validate_event_fields(event, required_fields) do
    missing_fields =
      Enum.filter(required_fields, fn field ->
        not Map.has_key?(event, field)
      end)

    if Enum.empty?(missing_fields) do
      {:ok, event}
    else
      Logger.error(
        "Event validation failed - missing required fields - event: #{inspect(event)}, missing_fields: #{inspect(missing_fields)}, present_fields: #{inspect(Map.keys(event))}"
      )

      {:error, :missing_required_fields}
    end
  end

  defp schedule_reconnect(state) do
    # Ensure we don't stack multiple timers
    if state.reconnect_timer, do: Process.cancel_timer(state.reconnect_timer)

    # Update connection status to disconnected if we have a connection_id
    if state.connection_id do
      ConnectionMonitor.update_connection_status(state.connection_id, :disconnected)
    end

    # Calculate delay with exponential backoff using unified retry logic
    retry_state = %{
      mode: :exponential,
      base_backoff: @initial_reconnect_delay,
      max_backoff: @max_reconnect_delay,
      # Approximate 30-50% jitter range
      jitter: 0.4,
      # Retry module uses 1-based attempts
      attempt: state.reconnect_attempts + 1
    }

    final_delay = Retry.calculate_backoff(retry_state)

    Logger.info("Scheduling SSE reconnect",
      attempt: state.reconnect_attempts + 1,
      delay_ms: final_delay,
      delay_seconds: final_delay / 1000,
      max_delay_seconds: @max_reconnect_delay / 1000,
      previous_status: state.status
    )

    timer = Process.send_after(self(), :reconnect_timer, final_delay)

    %{
      state
      | reconnect_timer: timer,
        reconnect_attempts: state.reconnect_attempts + 1,
        status: :disconnected
    }
  end

  defp process_sse_events(events, state, async_id) do
    # Process multiple events from a single chunk
    last_event_id = state.last_event_id

    {new_last_event_id, _processed_count} =
      events
      |> Enum.reduce({last_event_id, 0}, fn event, {last_id, count} ->
        case process_event(event, state) do
          {:ok, event_id} ->
            {event_id || last_id, count + 1}

          {:error, reason} ->
            Logger.error(
              "Failed to process SSE event - map_slug: #{state.map_slug}, error: #{inspect(reason)}, event: #{inspect(event)}"
            )

            {last_id, count}
        end
      end)

    # Removed verbose debug logging

    # Continue streaming
    async_response = %HTTPoison.AsyncResponse{id: async_id}
    HTTPoison.stream_next(async_response)

    # Update state with new last_event_id
    new_state = %{state | last_event_id: new_last_event_id}
    {:noreply, new_state}
  end

  defp log_sse_events(events, chunk, map_slug) do
    Enum.each(events, fn event ->
      event_type = Map.get(event, "type", "unknown")

      unless chunk =~ ": keepalive" do
        Logger.debug("[SSE] Event: #{event_type} (#{map_slug})")
      end
    end)
  end
end

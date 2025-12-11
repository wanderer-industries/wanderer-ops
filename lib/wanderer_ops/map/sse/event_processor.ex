defmodule WandererOps.Map.EventProcessor do
  @moduledoc """
  Processes incoming SSE events from the Wanderer map API.

  This module acts as the central dispatcher for all map events,
  routing them to appropriate handlers based on event type.

  ## Event Categories

  Events are organized into logical categories for better maintainability:

  - **System Events**: Changes to wormhole systems (add/remove/update)
  - **Connection Events**: Wormhole connection changes (future)
  - **Signature Events**: Cosmic signature updates (future)
  - **ACL Events**: Access control list changes for character tracking
  - **Special Events**: Meta events like connection status

  The event processor uses a two-stage routing approach:
  1. Categorize the event based on its type
  2. Delegate to the appropriate category handler
  """

  require Logger

  @pubsub_client Application.compile_env(:wanderer_ops, :pubsub_client)

  @doc """
  Processes a single event from the SSE stream.

  ## Parameters
  - `event` - The parsed event data as a map
  - `map_slug` - The map identifier for logging context

  ## Returns
  - `:ok` on successful processing
  - `{:error, reason}` on failure
  """
  @spec process_event(map(), String.t()) :: :ok | {:error, term()}
  def process_event(event, map_url) when is_map(event) do
    event_type = Map.get(event, "type")

    # Change to info level and add payload preview for rally events
    log_level =
      if event_type in [], do: :info, else: :debug

    Logger.log(log_level, "Processing SSE event",
      map_url: map_url,
      event_type: event_type,
      event_id: Map.get(event, "id"),
      payload_preview:
        if(event_type in [],
          do: inspect(Map.get(event, "payload", %{}), limit: 200),
          else: nil
        )
    )

    case route_event(event_type, event, map_url) do
      :ok ->
        Logger.debug("Event processed successfully",
          map_url: map_url,
          event_type: event_type
        )

        :ok

      {:error, reason} = error ->
        Logger.error("Event processing failed",
          map_url: map_url,
          event_type: event_type,
          error: inspect(reason)
        )

        error

      :ignored ->
        Logger.debug("Event ignored",
          map_url: map_url,
          event_type: event_type
        )

        :ok
    end
  end

  def process_event(event, map_url) do
    Logger.error("Invalid event format",
      map_url: map_url,
      event: inspect(event)
    )

    {:error, :invalid_event_format}
  end

  # Routes an event to the appropriate handler based on event type.
  #
  # ## Event Categories
  # - System Events: add_system, deleted_system, system_metadata_changed
  # - Connection Events: connection_added, connection_removed, connection_updated
  # - Signature Events: signature_added, signature_removed, signatures_updated
  # - ACL Events: acl_member_added, acl_member_removed, acl_member_updated
  # - Special Events: connected, map_kill
  @spec route_event(String.t(), map(), String.t()) :: :ok | {:error, term()} | :ignored
  defp route_event(event_type, event, map_url) do
    case categorize_event(event_type) do
      :system -> handle_system_event(event_type, event, map_url)
      :connection -> handle_connection_event(event_type, event, map_url)
      :signature -> handle_signature_event(event_type, event, map_url)
      :character -> handle_character_event(event_type, event, map_url)
      :acl -> handle_acl_event(event_type, event, map_url)
      :rally -> handle_rally_event(event_type, event, map_url)
      :special -> handle_special_event(event_type, event, map_url)
      :unknown -> handle_unknown_event(event_type, event, map_url)
    end
  end

  # Categorizes events based on their type prefix or pattern
  @spec categorize_event(String.t()) :: atom()
  defp categorize_event(event_type) do
    cond do
      event_type in ["add_system", "deleted_system", "system_metadata_changed"] ->
        :system

      event_type in ["connection_added", "connection_removed", "connection_updated"] ->
        :connection

      event_type in ["signature_added", "signature_removed", "signatures_updated"] ->
        :signature

      event_type in ["character_added", "character_removed", "character_updated"] ->
        :character

      event_type in ["acl_member_added", "acl_member_removed", "acl_member_updated"] ->
        :acl

      event_type in ["rally_point_added", "rally_point_removed"] ->
        :rally

      event_type in ["connected", "map_kill"] ->
        :special

      true ->
        :unknown
    end
  end

  # System event handlers
  @spec handle_system_event(String.t(), map(), String.t()) :: :ok | {:error, term()}
  defp handle_system_event("add_system", event, map_url) do
    @pubsub_client.broadcast!(WandererOps.PubSub, map_url, %{event: :add_system, payload: event})
    :ok
  end

  defp handle_system_event("deleted_system", event, map_url) do
    @pubsub_client.broadcast!(WandererOps.PubSub, map_url, %{
      event: :deleted_system,
      payload: event
    })

    :ok
  end

  defp handle_system_event("system_metadata_changed", event, map_url) do
    @pubsub_client.broadcast!(WandererOps.PubSub, map_url, %{
      event: :system_metadata_changed,
      payload: event
    })

    :ok
  end

  # Connection event handlers (not implemented yet)
  @spec handle_connection_event(String.t(), map(), String.t()) :: :ignored
  defp handle_connection_event("connection_added", event, map_url) do
    @pubsub_client.broadcast!(WandererOps.PubSub, map_url, %{
      event: :connection_added,
      payload: event
    })

    :ok
  end

  @spec handle_connection_event(String.t(), map(), String.t()) :: :ignored
  defp handle_connection_event("connection_updated", event, map_url) do
    @pubsub_client.broadcast!(WandererOps.PubSub, map_url, %{
      event: :connection_updated,
      payload: event
    })

    :ok
  end

  defp handle_connection_event("connection_removed", event, map_url) do
    @pubsub_client.broadcast!(WandererOps.PubSub, map_url, %{
      event: :connection_removed,
      payload: event
    })

    :ok
  end

  # Signature event handlers (not implemented yet)
  @spec handle_signature_event(String.t(), map(), String.t()) :: :ignored
  defp handle_signature_event(_event_type, _event, _map_url) do
    # Future implementation for signature scanning events
    :ignored
  end

  # Character event handlers
  @spec handle_character_event(String.t(), map(), String.t()) :: :ignored
  defp handle_character_event(_event_type, _event, _map_url) do
    :ignored
  end

  # ACL event handlers (legacy - keeping for compatibility)
  @spec handle_acl_event(String.t(), map(), String.t()) :: :ignored
  defp handle_acl_event(_event_type, _event, _map_url) do
    # ACL events are now handled by character events
    :ignored
  end

  # Rally point event handlers
  @spec handle_rally_event(String.t(), map(), String.t()) :: :ok | {:error, term()} | :ignored
  defp handle_rally_event(_event_type, _event, _map_url) do
    :ignored
  end

  # Special event handlers
  @spec handle_special_event(String.t(), map(), String.t()) :: :ok | :ignored
  defp handle_special_event("connected", event, map_url) do
    Logger.debug("SSE connection established",
      map_url: map_url,
      event_id: Map.get(event, "id"),
      server_time: Map.get(event, "server_time")
    )

    :ok
  end

  defp handle_special_event("map_kill", _event, _map_url) do
    # Kill events are handled by the existing killmail pipeline
    :ignored
  end

  # Unknown event handler
  @spec handle_unknown_event(String.t(), map(), String.t()) :: :ignored
  defp handle_unknown_event(unknown_type, event, map_url) do
    # Log full payload for unknown events to discover new event types
    Logger.warning("Unknown event type received",
      map_url: map_url,
      event_type: unknown_type,
      payload_keys: inspect(Map.keys(Map.get(event, "payload", %{}))),
      full_payload: inspect(event)
    )

    :ignored
  end

  @doc """
  Validates that an event has all required fields.

  ## Required Fields
  - `id` - Unique event identifier (ULID)
  - `type` - Event type string
  - `map_id` - Map UUID
  - `timestamp` - ISO 8601 timestamp
  - `payload` - Event-specific data
  """
  @spec validate_event(map()) :: :ok | {:error, term()}
  def validate_event(event) do
    # case WandererOps.Shared.Validation.validate_event_data(event) do
    #   {:ok, _} -> :ok
    #   {:error, reason} -> {:error, reason}
    # end

    :ok
  end

  # Event validation logic moved to WandererOps.Shared.Validation

  @doc """
  Extracts event metadata for logging and debugging.
  """
  @spec extract_event_metadata(map()) :: map()
  def extract_event_metadata(event) when is_map(event) do
    %{
      id: Map.get(event, "id"),
      type: Map.get(event, "type"),
      map_id: Map.get(event, "map_id"),
      timestamp: Map.get(event, "timestamp"),
      payload_keys: event |> Map.get("payload", %{}) |> Map.keys()
    }
  end

  def extract_event_metadata(_), do: %{error: "invalid_event_format"}
end

defmodule WandererOpsWeb.SharedMapLive do
  @moduledoc """
  LiveView for displaying shared read-only dashboard access via time-limited tokens.
  """

  use WandererOpsWeb, :live_view

  require Logger

  alias WandererOps.Api.ShareLink
  alias WandererOps.Infrastructure.Cache
  alias WandererOpsWeb.Components.React

  @impl true
  def mount(%{"token" => token}, _session, socket) do
    case validate_token(token) do
      {:ok, share_link} ->
        Logger.info("SharedMapLive: Valid token access")

        {:ok, maps} = WandererOps.Api.Map.read()

        # Subscribe to map updates for real-time data
        maps
        |> Enum.each(fn map ->
          Logger.info("SharedMapLive subscribing to map updates: #{map.id}")
          Phoenix.PubSub.subscribe(WandererOps.PubSub, map.id)
        end)

        {:ok, map_cached_data} = WandererOps.Map.Utils.prepare_cached_data(maps)

        license_state =
          Cache.get(Cache.Keys.license_validation())
          |> case do
            {:ok, result} -> result
            _ -> nil
          end

        {:ok,
         socket
         |> assign(
           token: token,
           share_link: share_link,
           maps: maps |> Enum.map(&map_ui_map/1),
           map_cached_data: map_cached_data,
           license_state: license_state,
           is_valid: true,
           expires_at: share_link.expires_at,
           page_title: "Dashboard - Shared View"
         )}

      {:error, :expired} ->
        Logger.info("SharedMapLive: Expired token access attempt")

        {:ok,
         socket
         |> assign(
           is_valid: false,
           error_type: :expired,
           page_title: "Link Expired"
         )}

      {:error, :not_found} ->
        Logger.info("SharedMapLive: Invalid token access attempt")

        {:ok,
         socket
         |> assign(
           is_valid: false,
           error_type: :not_found,
           page_title: "Link Not Found"
         )}
    end
  end

  @impl true
  def handle_info(
        %{event: :data_updated, payload: _payload},
        %{assigns: %{maps: maps}} = socket
      ) do
    Logger.info("SharedMapLive received :data_updated event")
    {:ok, map_cached_data} = WandererOps.Map.Utils.prepare_cached_data(maps)
    {:noreply, socket |> assign(map_cached_data: map_cached_data)}
  end

  @impl true
  def handle_info(_msg, socket) do
    {:noreply, socket}
  end

  defp validate_token(token) do
    case ShareLink.valid_by_token(token) do
      {:ok, share_link} when not is_nil(share_link) ->
        {:ok, share_link}

      {:ok, nil} ->
        # Token not found or expired - check if it exists but is expired
        check_if_expired(token)

      {:error, _} ->
        {:error, :not_found}
    end
  end

  defp check_if_expired(token) do
    import Ash.Query, only: [filter: 2]

    case ShareLink
         |> Ash.Query.for_read(:read)
         |> filter(token == ^token)
         |> Ash.read() do
      {:ok, [_link | _]} -> {:error, :expired}
      _ -> {:error, :not_found}
    end
  end

  defp map_ui_map(map) do
    {:ok, started} = Cachex.get(:maps_cache, "#{map.id}:started")

    map
    |> Map.take([
      :id,
      :title,
      :color,
      :is_main,
      :main_system_eve_id
    ])
    |> Map.put(:started, started)
  end
end

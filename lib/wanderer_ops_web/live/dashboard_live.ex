defmodule WandererOpsWeb.DashboardLive do
  use WandererOpsWeb, :live_view

  require Logger

  alias WandererOps.Infrastructure.Cache
  alias WandererOpsWeb.Components.React

  def mount(_params, _session, socket) do
    {:ok,
     socket
     |> assign(
       is_connected?: false,
       maps: [],
       license_state: nil,
       map_cached_data: %{}
     )}
  end

  @impl true
  def handle_params(params, _url, socket) do
    {:noreply,
     socket
     |> apply_action(socket.assigns.live_action, params)}
  end

  def handle_event("ui:start_map", map_id, socket) do
    WandererOps.Map.Manager.start_map(map_id)
    Process.send_after(self(), :refresh_maps, 1000)
    {:noreply, socket}
  end

  def handle_event("ui:stop_map", map_id, socket) do
    WandererOps.Map.Manager.stop_map(map_id)
    Process.send_after(self(), :refresh_maps, 1000)
    {:noreply, socket}
  end

  def handle_event("ui:remove_map", map_id, socket) do
    case WandererOps.Api.Map.by_id(map_id) do
      {:ok, map} ->
        :ok =
          map
          |> WandererOps.Api.Map.destroy()

        {:noreply,
         socket
         |> push_patch(to: ~p"/")}

      _ ->
        {:noreply, socket |> put_flash(:error, "Failed to remove map. Try again.")}
    end
  end

  def handle_event("validate", %{"form" => params}, socket) do
    form = AshPhoenix.Form.validate(socket.assigns.form, params)
    {:noreply, assign(socket, form: form)}
  end

  def handle_event("create", %{"form" => form}, socket) do
    case WandererOps.Api.Map.new(form) do
      {:ok, _map} ->
        # {:ok, maps} = WandererOps.Api.Map.read()

        {:noreply,
         socket
         # |> assign(maps: maps |> Enum.map(fn map -> map_ui_map(map) end))
         |> push_patch(to: ~p"/")}

      _ ->
        {:noreply, socket |> put_flash(:error, "Failed to create map. Try again.")}
    end
  end

  def handle_event("edit", %{"form" => form} = _params, socket) do
    {:ok, _} =
      socket.assigns.edit_map
      |> WandererOps.Api.Map.update(form)

    {:noreply,
     socket
     |> push_patch(to: ~p"/")}
  end

  def handle_event(
        "ui:mark_as_main",
        %{"mapId" => map_id, "systemEveId" => system_eve_id},
        socket
      ) do
    {:ok, map} = WandererOps.Api.Map.by_id(map_id)

    {:ok, _updated_map} =
      map
      |> WandererOps.Api.Map.update_main_system(%{main_system_eve_id: system_eve_id})

    {:ok, maps} = WandererOps.Api.Map.read()

    {:noreply,
     socket
     |> assign(maps: maps |> Enum.map(fn map -> map_ui_map(map) end))}
  end

  def handle_event(
        "ui:mark_map_as_main",
        %{"mapId" => map_id},
        socket
      ) do
    {:ok, maps} = WandererOps.Api.Map.read()

    maps =
      maps
      |> Enum.map(fn map ->
        map
        |> WandererOps.Api.Map.update_is_main!(%{is_main: map_id == map.id})
      end)

    Cachex.put(
      :maps_shared_cache,
      "main",
      map_id
    )

    {:noreply,
     socket
     |> assign(maps: maps |> Enum.map(fn map -> map_ui_map(map) end))}
  end

  # Share link management handlers

  def handle_event(
        "ui:create_share_link",
        params,
        socket
      ) do
    hours = Map.get(params, "expiresInHours", 24)
    is_snapshot = Map.get(params, "isSnapshot", false)
    password = Map.get(params, "password")
    description = Map.get(params, "description")
    expires_at = DateTime.add(DateTime.utc_now(), hours * 3600, :second)

    attrs = %{expires_at: expires_at, is_snapshot: is_snapshot, description: description}

    # Capture snapshot data if this is a snapshot link
    attrs =
      if is_snapshot do
        case WandererOps.Services.SnapshotService.capture_snapshot() do
          {:ok, snapshot_data} ->
            Map.put(attrs, :snapshot_data, snapshot_data)

          {:error, reason} ->
            Logger.error("Failed to capture snapshot: #{inspect(reason)}")
            attrs
        end
      else
        attrs
      end

    # Pass password as argument (merged with attrs) for hashing
    input = Map.put(attrs, :password, password)

    case WandererOps.Api.ShareLink.new(input) do
      {:ok, share_link} ->
        url = WandererOpsWeb.Endpoint.url() <> "/shared/#{share_link.token}"

        {:reply,
         %{
           success: true,
           link: %{
             id: share_link.id,
             token: share_link.token,
             url: url,
             expires_at: DateTime.to_iso8601(share_link.expires_at),
             is_expired: false,
             is_snapshot: share_link.is_snapshot,
             snapshot_at: share_link.snapshot_at && DateTime.to_iso8601(share_link.snapshot_at),
             has_password: not is_nil(share_link.password_hash),
             description: share_link.description
           }
         }, socket}

      {:error, _} ->
        {:reply, %{success: false, error: "Failed to create share link"}, socket}
    end
  end

  def handle_event(
        "ui:delete_share_link",
        %{"linkId" => link_id},
        socket
      ) do
    case WandererOps.Api.ShareLink.by_id(link_id) do
      {:ok, link} ->
        WandererOps.Api.ShareLink.destroy(link)
        {:reply, %{success: true}, socket}

      _ ->
        {:reply, %{success: false, error: "Link not found"}, socket}
    end
  end

  def handle_event(
        "ui:get_share_links",
        _params,
        socket
      ) do
    case WandererOps.Api.ShareLink.all_links() do
      {:ok, links} ->
        now = DateTime.utc_now()

        links_data =
          links
          |> Enum.map(fn link ->
            %{
              id: link.id,
              token: link.token,
              expires_at: DateTime.to_iso8601(link.expires_at),
              label: link.label,
              url: WandererOpsWeb.Endpoint.url() <> "/shared/#{link.token}",
              is_expired: DateTime.compare(link.expires_at, now) == :lt,
              is_snapshot: link.is_snapshot,
              snapshot_at: link.snapshot_at && DateTime.to_iso8601(link.snapshot_at),
              has_password: not is_nil(link.password_hash),
              description: link.description
            }
          end)

        {:reply, %{links: links_data}, socket}

      _ ->
        {:reply, %{links: []}, socket}
    end
  end

  @impl true
  def handle_info(
        :refresh_maps,
        socket
      ) do
    {:ok, maps} = WandererOps.Api.Map.read()

    {:noreply,
     socket
     |> assign(maps: maps |> Enum.map(&map_ui_map/1))}
  end

  @impl true
  def handle_info(
        %{event: :data_updated, payload: _payload},
        %{assigns: %{maps: maps}} = socket
      ) do
    Logger.info("DashboardLive received :data_updated event, re-running border detection")
    {:ok, map_cached_data} = WandererOps.Map.Utils.prepare_cached_data(maps)

    # Debug: Log first system's position to verify cache data
    first_system =
      map_cached_data
      |> Enum.find_value(fn {_map_id, data} ->
        case data[:systems] do
          [system | _] -> system
          _ -> nil
        end
      end)

    if first_system do
      Logger.info(
        "DashboardLive first system after update: position_x=#{first_system["position_x"]}, position_y=#{first_system["position_y"]}"
      )
    end

    {:noreply, socket |> assign(map_cached_data: map_cached_data)}
  end

  defp apply_action(socket, :index, _params) do
    {:ok, maps} = WandererOps.Api.Map.read()

    maps
    |> Enum.each(fn map ->
      Logger.info("DashboardLive subscribing to map updates: #{map.id}")
      Phoenix.PubSub.subscribe(WandererOps.PubSub, map.id)
    end)

    {:ok, map_cached_data} = WandererOps.Map.Utils.prepare_cached_data(maps)

    license_state =
      Cache.get(Cache.Keys.license_validation())
      |> case do
        {:ok, result} -> result
        _ -> nil
      end

    socket
    |> assign(:page_title, "Wanderer OPS")
    |> assign(maps: maps |> Enum.map(fn map -> map_ui_map(map) end))
    |> assign(map_cached_data: map_cached_data, license_state: license_state)
  end

  defp apply_action(socket, :create, _params) do
    socket
    |> assign(:active_page, :create)
    |> assign(:page_title, "Add map")
    |> assign(
      :form,
      AshPhoenix.Form.for_create(WandererOps.Api.Map, :new,
        forms: [
          auto?: true
        ]
      )
      |> to_form()
    )
  end

  defp apply_action(socket, :edit, %{"id" => map_id} = _params) do
    {:ok, map} = WandererOps.Api.Map.by_id(map_id)

    socket
    |> assign(:page_title, "Edit Map")
    |> assign(:edit_map, map)
    |> assign(
      :form,
      map |> AshPhoenix.Form.for_update(:update, forms: [auto?: true]) |> to_form()
    )
  end

  def map_ui_map(map) do
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

  def map_ui_system(%{"solar_system_id" => solar_system_id} = system) do
    {:ok, solar_system_info} =
      WandererOps.CachedInfo.get_system_static_info(solar_system_id)

    system |> Map.put("static_info", solar_system_info)
  end
end

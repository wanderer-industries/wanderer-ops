defmodule WandererOpsWeb.DashboardLive do
  use WandererOpsWeb, :live_view

  require Logger

  alias WandererOpsWeb.Components.React

  def mount(_params, _session, socket) do
    {:ok,
     assign(socket,
       is_connected?: true,
       maps: [],
       map_cached_data: %{}
     )}
  end

  def mount(_params, _session, socket) do
    {:ok,
     socket
     |> assign(
       is_connected?: false,
       maps: [],
       map_cached_data: %{}
     )}
  end

  @impl true
  def handle_params(params, _url, socket) do
    {:noreply,
     socket
     |> apply_action(socket.assigns.live_action, params)}
  end

  def handle_event("ui:remove_map", map_id, socket) do
    case WandererOps.Api.Map.by_id(map_id) do
      {:ok, map} ->
        :ok =
          map
          |> WandererOps.Api.Map.destroy()

        {:noreply,
         socket
         |> push_patch(to: ~p"/dashboard")}

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
         |> push_patch(to: ~p"/dashboard")}

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
     |> push_patch(to: ~p"/dashboard")}
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
    {:ok, map} = WandererOps.Api.Map.by_id(map_id)

    # {:ok, _updated_map} =
    #   map
    #   |> WandererOps.Api.Map.update_main_system(%{main_system_eve_id: system_eve_id})

    {:ok, maps} = WandererOps.Api.Map.read()

    maps =
      maps
      |> Enum.map(fn map ->
        map
        |> WandererOps.Api.Map.update_is_main!(%{is_main: map_id == map.id})
      end)

    {:noreply,
     socket
     |> assign(maps: maps |> Enum.map(fn map -> map_ui_map(map) end))}
  end

  @impl true
  def handle_info(
        %{event: :data_updated, payload: _payload},
        %{assigns: %{maps: maps}} = socket
      ) do
    cached_data = prepare_cached_data(maps)

    {:noreply, socket |> assign(map_cached_data: cached_data)}
  end

  defp apply_action(socket, :index, _params) do
    {:ok, maps} = WandererOps.Api.Map.read()

    maps
    |> Enum.each(fn map ->
      Phoenix.PubSub.subscribe(WandererOps.PubSub, map.id)
    end)

    cached_data = prepare_cached_data(maps)

    socket
    |> assign(:page_title, "Wanderer OPS")
    |> assign(maps: maps |> Enum.map(fn map -> map_ui_map(map) end))
    |> assign(map_cached_data: cached_data)
  end

  defp apply_action(socket, :create, _params) do
    socket
    |> assign(:active_page, :access_lists)
    |> assign(:page_title, "Map - New")
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
    |> assign(:page_title, "Map - Edit")
    |> assign(:edit_map, map)
    |> assign(
      :form,
      map |> AshPhoenix.Form.for_update(:update, forms: [auto?: true]) |> to_form()
    )
  end

  defp prepare_cached_data(maps) do
    # Sort maps to prioritize main maps first
    sorted_maps = Enum.sort_by(maps, & &1.is_main, :desc)

    {cached_data, _used_connections, _used_systems} =
      sorted_maps
      |> Enum.reduce({%{}, MapSet.new(), MapSet.new()}, fn map,
                                                           {acc, used_connections, used_systems} ->
        raw_data = Cachex.get!(:maps_cache, map.id)

        case raw_data do
          %{systems: systems, connections: connections} ->
            # Filter out systems that are already used by other maps
            unique_systems =
              Enum.reject(systems, fn system ->
                MapSet.member?(used_systems, system["solar_system_id"])
              end)

            # Filter out connections that are already used by other maps
            unique_connections =
              Enum.reject(connections, fn conn ->
                connection_key = {conn["solar_system_source"], conn["solar_system_target"]}

                MapSet.member?(used_connections, connection_key) ||
                  MapSet.member?(
                    used_connections,
                    {conn["solar_system_target"], conn["solar_system_source"]}
                  )
              end)

            # Add these systems to the used set
            new_used_systems =
              Enum.reduce(unique_systems, used_systems, fn system, acc_used ->
                MapSet.put(acc_used, system["solar_system_id"])
              end)

            # Add these connections to the used set
            new_used_connections =
              Enum.reduce(unique_connections, used_connections, fn conn, acc_used ->
                connection_key = {conn["solar_system_source"], conn["solar_system_target"]}
                MapSet.put(acc_used, connection_key)
              end)

            filtered_data = %{systems: unique_systems, connections: unique_connections}
            {Map.put(acc, map.id, filtered_data), new_used_connections, new_used_systems}

          _ ->
            {Map.put(acc, map.id, raw_data), used_connections, used_systems}
        end
      end)

    cached_data
  end

  def map_ui_map(map),
    do:
      map
      |> Map.take([
        :id,
        :title,
        :color,
        :is_main,
        :main_system_eve_id
      ])
end

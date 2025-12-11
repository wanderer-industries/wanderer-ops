defmodule WandererOpsWeb.Components.React.Dashboard do
  use WandererOpsWeb, :live_component

  require Logger

  import LiveReact

  def update(assigns, socket) do
    connection_counts =
      assigns.map_cached_data
      |> Enum.map(fn {map_id, data} ->
        {map_id, length(data[:connections] || [])}
      end)
      |> Enum.into(%{})

    # Debug: Log first system's keys to check position data
    first_system =
      assigns.map_cached_data
      |> Enum.find_value(fn {_map_id, data} ->
        case data[:systems] do
          [system | _] -> system
          _ -> nil
        end
      end)

    if first_system do
      Logger.info("React.Dashboard first system keys: #{inspect(Map.keys(first_system))}")

      Logger.info(
        "React.Dashboard first system position_x: #{inspect(first_system["position_x"])}"
      )
    end

    Logger.info("React.Dashboard update called, connection_counts: #{inspect(connection_counts)}")

    {:ok, assign(socket, assigns)}
  end

  attr(:data, :any, required: true)
  attr(:map_cached_data, :any, required: true)
  attr(:license_state, :any, required: true)

  def render(assigns) do
    ~H"""
    <div class="h-full">
      <.react
        name="Dashboard"
        data={@data}
        map_cached_data={@map_cached_data}
        license_state={@license_state}
        class="h-full"
      />
    </div>
    """
  end
end

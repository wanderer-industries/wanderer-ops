defmodule WandererOpsWeb.Components.React.Dashboard do
  use WandererOpsWeb, :live_component

  import LiveReact

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

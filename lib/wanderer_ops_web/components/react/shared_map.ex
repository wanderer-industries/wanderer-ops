defmodule WandererOpsWeb.Components.React.SharedMap do
  @moduledoc """
  LiveComponent bridge for the read-only SharedMap React component.
  """

  use WandererOpsWeb, :live_component

  import LiveReact

  def update(assigns, socket) do
    {:ok, assign(socket, assigns)}
  end

  attr :map, :any, required: true
  attr :map_cached_data, :any, required: true
  attr :expires_at, :string, required: true

  def render(assigns) do
    ~H"""
    <div class="h-full">
      <.react
        name="SharedMap"
        map={@map}
        map_cached_data={@map_cached_data}
        expires_at={@expires_at}
        class="h-full"
      />
    </div>
    """
  end
end

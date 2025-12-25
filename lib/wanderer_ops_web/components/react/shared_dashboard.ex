defmodule WandererOpsWeb.Components.React.SharedDashboard do
  @moduledoc """
  LiveComponent bridge for the read-only SharedDashboard React component.
  """

  use WandererOpsWeb, :live_component

  import LiveReact

  def update(assigns, socket) do
    {:ok, assign(socket, assigns)}
  end

  attr :data, :any, required: true
  attr :map_cached_data, :any, required: true
  attr :license_state, :any, required: true
  attr :expires_at, :string, required: true
  attr :is_snapshot, :boolean, default: false
  attr :snapshot_at, :string, default: nil
  attr :description, :string, default: nil

  def render(assigns) do
    ~H"""
    <div class="h-full">
      <.react
        name="SharedDashboard"
        data={@data}
        map_cached_data={@map_cached_data}
        license_state={@license_state}
        expires_at={@expires_at}
        is_snapshot={@is_snapshot}
        snapshot_at={@snapshot_at}
        description={@description}
        class="h-full"
      />
    </div>
    """
  end
end

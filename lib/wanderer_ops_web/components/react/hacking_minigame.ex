defmodule WandererOpsWeb.Components.React.HackingMinigame do
  @moduledoc """
  LiveComponent bridge for the EVE-style hacking mini-game React component.
  Used as an unlock mechanism for protected shared dashboard links.
  """

  use WandererOpsWeb, :live_component

  import LiveReact

  def update(assigns, socket) do
    {:ok, assign(socket, assigns)}
  end

  attr :difficulty, :string, required: true
  attr :seed, :string, required: true

  def render(assigns) do
    ~H"""
    <div class="h-full">
      <.react name="HackingMinigame" difficulty={@difficulty} seed={@seed} class="h-full" />
    </div>
    """
  end
end

defmodule WandererOps.Map.ServerSupervisor do
  @moduledoc false
  use Supervisor, restart: :transient

  def start_link(args), do: Supervisor.start_link(__MODULE__, args)

  @impl true
  def init(args) do
    children = [
      %{
        id: WandererOps.Map.Server,
        start: {WandererOps.Map.Server, :start_link, [args]},
        restart: :transient,
        shutdown: 5000,
        type: :worker
      }
    ]

    Supervisor.init(children, strategy: :one_for_one, auto_shutdown: :any_significant)
  end
end

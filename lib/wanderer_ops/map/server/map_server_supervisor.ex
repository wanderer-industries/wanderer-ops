defmodule WandererOps.Map.ServerSupervisor do
  @moduledoc false
  use Supervisor, restart: :transient

  def start_link(args), do: Supervisor.start_link(__MODULE__, args)

  @impl true
  def init(args) do
    children = [
      {WandererOps.Map.Server, args}
    ]

    Supervisor.init(children, strategy: :one_for_one, auto_shutdown: :any_significant)
  end
end

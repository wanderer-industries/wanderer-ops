defmodule WandererOps.Api do
  @moduledoc false

  use Ash.Domain,
    extensions: [AshPhoenix]

  resources do
    resource WandererOps.Api.Map
    resource WandererOps.Api.ShareLink
  end
end

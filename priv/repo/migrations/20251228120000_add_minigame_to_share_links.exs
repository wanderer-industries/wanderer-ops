defmodule WandererOps.Repo.Migrations.AddMinigameToShareLinks do
  use Ecto.Migration

  def up do
    alter table(:share_links) do
      add :minigame_enabled, :boolean, default: false
      add :minigame_difficulty, :string
    end
  end

  def down do
    alter table(:share_links) do
      remove :minigame_difficulty
      remove :minigame_enabled
    end
  end
end

defmodule WandererOps.Api.ShareLink do
  @moduledoc """
  Resource for managing dashboard share links with time-limited access tokens.
  Provides read-only access to the entire dashboard.
  """

  use Ash.Resource,
    domain: WandererOps.Api,
    data_layer: AshPostgres.DataLayer

  postgres do
    repo(WandererOps.Repo)
    table("share_links")
  end

  attributes do
    uuid_primary_key :id

    attribute :token, :string do
      allow_nil? false
      constraints trim?: false, min_length: 32, max_length: 64
    end

    attribute :expires_at, :utc_datetime do
      allow_nil? false
    end

    attribute :label, :string do
      allow_nil? true
      constraints max_length: 100
    end

    attribute :is_snapshot, :boolean do
      allow_nil? false
      default false
    end

    attribute :snapshot_data, :map do
      allow_nil? true
    end

    attribute :snapshot_at, :utc_datetime do
      allow_nil? true
    end

    create_timestamp :inserted_at
    update_timestamp :updated_at
  end

  actions do
    defaults [:read, :destroy]

    create :new do
      accept [:label, :expires_at, :is_snapshot, :snapshot_data]

      change fn changeset, _context ->
        token = :crypto.strong_rand_bytes(32) |> Base.url_encode64(padding: false)
        changeset = Ash.Changeset.force_change_attribute(changeset, :token, token)

        # Set snapshot_at if this is a snapshot
        if Ash.Changeset.get_attribute(changeset, :is_snapshot) do
          Ash.Changeset.force_change_attribute(changeset, :snapshot_at, DateTime.utc_now())
        else
          changeset
        end
      end
    end

    read :valid_by_token do
      argument :token, :string, allow_nil?: false
      get? true
      filter expr(token == ^arg(:token) and expires_at > now())
    end

    read :all_links do
      prepare build(sort: [inserted_at: :desc])
    end
  end

  code_interface do
    define :new, action: :new
    define :read, action: :read
    define :all_links, action: :all_links
    define :destroy, action: :destroy
    define :valid_by_token, action: :valid_by_token, args: [:token]
    define :by_id, get_by: [:id], action: :read
  end

  identities do
    identity :unique_token, [:token]
  end
end

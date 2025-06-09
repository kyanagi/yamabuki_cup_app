class CreatePlayerEmailCredentials < ActiveRecord::Migration[8.0]
  def change
    create_table :player_email_credentials do |t|
      t.references :player, null: false, foreign_key: true
      t.string :email, null: false, index: { unique: true }

      t.timestamps
    end
  end
end

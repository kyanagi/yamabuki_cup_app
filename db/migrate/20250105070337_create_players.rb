class CreatePlayers < ActiveRecord::Migration[8.0]
  def change
    create_table :players, comment: "選手" do |t|
      t.timestamps
    end
  end
end

class CreateQuestionPlayerResults < ActiveRecord::Migration[8.0]
  def change
    create_table :question_player_results, comment: "問題に対する選手の解答結果" do |t|
      t.references :player, null: false, foreign_key: true, comment: "players.id"
      t.references :question_result, null: false, foreign_key: true, comment: "question_results.id"
      t.integer :result, null: false, comment: "正誤"
      t.integer :situation, null: false, comment: "解答権を得た状況"

      t.timestamps
    end
  end
end

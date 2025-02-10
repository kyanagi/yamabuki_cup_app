namespace :sample_data do
  desc "ペーパー結果のサンプルデータを作成"
  task create_yontaku_results: :environment do
    num_players = 100
    score_range = 0..250

    players_data = num_players.times.map do
      name = Gimei.name

      {
        yontaku_player_result: {
          score: rand(score_range),
        },
        player_profile: {
          entry_list_name: name.kanji,
          family_name: name.last.kanji,
          given_name: name.first.kanji,
          family_name_kana: name.last.katakana,
          given_name_kana: name.first.katakana,
        },
      }
    end

    players_data.sort_by! { |data| -data[:yontaku_player_result][:score] }

    players_data.each.with_index(1) do |data, rank|
      data[:yontaku_player_result][:rank] = rank
    end

    ActiveRecord::Base.transaction do
      YontakuPlayerResult.destroy_all
      PlayerProfile.destroy_all
      Player.destroy_all

      players_data.each do |data|
        player = Player.create!

        PlayerProfile.create!(
          player:,
          **data[:player_profile]
        )

        YontakuPlayerResult.create!(
          player:,
          **data[:yontaku_player_result]
        )
      end
    end
  end
end

namespace :sample_data do
  desc "ペーパー結果のサンプルデータを作成"
  task create_yontaku_results: :environment do
    num_players = 150
    num_absent_players = 10
    score_range = 0..250

    players_data = num_players.times.map do |i|
      name = Gimei.name

      h = {
        player_profile: {
          entry_list_name: name.kanji,
          family_name: name.last.kanji,
          given_name: name.first.kanji,
          family_name_kana: name.last.katakana,
          given_name_kana: name.first.katakana,
        },
      }

      if i >= num_absent_players
        h[:yontaku_player_result] = {
          score: rand(score_range),
        }
      end

      h
    end

    players_data.sort_by! { |data| -(data.dig(:yontaku_player_result, :score) || -1) }

    players_data.each.with_index(1) do |data, rank|
      data[:yontaku_player_result][:rank] = rank if data[:yontaku_player_result]
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

        if data[:yontaku_player_result]
          YontakuPlayerResult.create!(
            player:,
            **data[:yontaku_player_result]
          )
        end
      end
    end
  end
end

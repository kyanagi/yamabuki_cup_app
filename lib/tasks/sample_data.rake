namespace :sample_data do
  desc "参加者登録"
  task create_players: :environment do
    Player.destroy_all
    PlayerProfile.destroy_all

    num_players = 150
    num_players.times do
      name = Gimei.name
      player = Player.create!
      PlayerProfile.create!(
        player:,
        entry_list_name: name.kanji,
        family_name: name.last.kanji,
        given_name: name.first.kanji,
        family_name_kana: name.last.katakana,
        given_name_kana: name.first.katakana
      )
      Round3CoursePreference.create!(
        player:,
        choice1_match_id: 31,
        choice2_match_id: 32,
        choice3_match_id: 33,
        choice4_match_id: 34
      )
    end
  end

  desc "問題のサンプルデータを作成"
  task create_questions: :environment do
    YontakuQuestion.delete_all
    300.times do |i|
      YontakuQuestion.create!(
        id: i + 1,
        text: "問題#{i + 1}",
        answer: (i % 4) + 1,
        choice1: "選択肢1",
        choice2: "選択肢2",
        choice3: "選択肢3",
        choice4: "選択肢4"
      )
    end

    ApproximationQuestion.delete_all
    ApproximationQuestion.create!(id: 1, text: "近似値1", answer: 100)
    ApproximationQuestion.create!(id: 2, text: "近似値2", answer: 200)

    QuestionProvider.delete_all
    Question.delete_all
    650.times do |i|
      address = Gimei.address
      Question.create!(
        id: i + 1,
        text: address.kanji,
        answer: address.city.kanji,
        another_answer: address.town.kanji,
        note: address.prefecture.kanji
      )
    end
    QuestionProvider.create!(next_question: Question.order(:id).first)
  end

  desc "ペーパー解答用紙のサンプルデータを作成"
  task create_paper_answers: :environment do
    YontakuPlayerPaper.delete_all
    ApproximationQuizAnswer.delete_all

    num_absent_players = 10
    Player.all.drop(num_absent_players).each do |player|
      YontakuPlayerPaper.create!(player:, paper_number: 1, answers: Array.new(200) { rand(1..4) }.map(&:to_s).to_json)
      YontakuPlayerPaper.create!(player:, paper_number: 2, answers: Array.new(100) { rand(1..4) }.map(&:to_s).to_json)
      ApproximationQuizAnswer.create!(player:, answer1: rand(10000), answer2: rand(10000))
    end
  end

  desc "ペーパーの採点を行う"
  task paper_quiz_grading: :environment do
    PaperQuizGrading.create!
  end

  desc "2Rの組分けを行う"
  task matchmake_round2: :environment do
    Matchmaking::Round2.create!
  end

  desc "2Rの試合を全て終了させる"
  task finish_round2: :environment do
    Round::ROUND2.matches.each do |match|
      MatchClosing.create!(match:)
    end
  end

  desc "3Rの組分けを行う"
  task matchmake_round3: :environment do
    Matchmaking::Round3.create!
  end

  desc "3Rの試合を全て終了させる"
  task finish_round3: :environment do
    Round::ROUND3.matches.each do |match|
      MatchClosing.create!(match:)
    end
  end

  desc "準々決勝の組分けを行う"
  task matchmake_quarterfinal: :environment do
    Matchmaking::Quarterfinal.create!
  end

  desc "準々決勝の試合を全て終了させる"
  task finish_quarterfinal: :environment do
    Round::QUARTERFINAL.matches.each do |match|
      MatchClosing.create!(match:)
    end
  end

  desc "準決勝の組分けを行う"
  task matchmake_semifinal: :environment do
    Matchmaking::Semifinal.create!
  end
end

# 1Rペーパークイズの採点および順位付けを行う。
class PaperQuizGrading < ActiveType::Object
  before_save :process

  PAPER1_QUESTION_COUNT = 200
  PAPER2_QUESTION_COUNT = 100

  private

  def process
    # 全てのプレイヤーの結果を初期化
    YontakuPlayerResult.destroy_all

    yontaku_questions = YontakuQuestion.find(1.upto(PAPER1_QUESTION_COUNT+PAPER2_QUESTION_COUNT).to_a)
    approx_question1 = ApproximationQuestion.find(1)
    approx_question2 = ApproximationQuestion.find(2)

    tiebreakers = 1.upto(Player.count).to_a.shuffle

    yontaku_player_results_data = Player.preload(:yontaku_player_papers).filter_map do |player|
      # 解答用紙が1枚もない場合は対象外
      next if player.yontaku_player_papers.empty?

      player_answers = get_player_answers(player)
      score = player_answers.zip(yontaku_questions).count do |player_answer, question|
        player_answer == question.answer
      end

      # 近似値クイズの誤差を計算
      diff1 = diff2 = 10_0000_0000
      approximation_quiz_answer = player.approximation_quiz_answer
      diff1 = (approximation_quiz_answer.answer1 - approx_question1.answer).abs if approximation_quiz_answer&.answer1
      diff2 = (approximation_quiz_answer.answer2 - approx_question2.answer).abs if approximation_quiz_answer&.answer2

      {
        player_id: player.id,
        score:,
        approximation_quiz_diff1: diff1,
        approximation_quiz_diff2: diff2,
        tiebreaker: tiebreakers.pop,
      }
    end

    # 順位付け
    yontaku_player_results_data.sort_by! do |result|
      [
        -result[:score],
        result[:approximation_quiz_diff1],
        result[:approximation_quiz_diff2],
        result[:tiebreaker],
      ]
    end

    yontaku_player_results_data.each.with_index(1) do |result, rank|
      result[:rank] = rank
    end

    YontakuPlayerResult.insert_all!(yontaku_player_results_data)
  end

  def get_player_answers(player)
    player_papers = player.yontaku_player_papers.to_a.index_by(&:paper_number)
    paper1_answers = player_papers[1] ? JSON.parse(player_papers[1].answers) : Array.new(PAPER1_QUESTION_COUNT)
    paper2_answers = player_papers[2] ? JSON.parse(player_papers[2].answers) : Array.new(PAPER2_QUESTION_COUNT)
    unless paper1_answers.size == PAPER1_QUESTION_COUNT && paper2_answers.size == PAPER2_QUESTION_COUNT
      raise "解答用紙の問題数が不正です: player_id=#{player.id}"
    end
    (paper1_answers + paper2_answers).map do |ans|
      if /\A\d+\z/.match?(ans)
        ans.to_i
      end
    end
  end
end

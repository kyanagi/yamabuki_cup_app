FactoryBot.define do
  factory :player

  factory :player_profile do
    player

    transient do
      name { Gimei.name }
    end

    entry_list_name { SecureRandom.hex }
    family_name { name.family.kanji }
    family_name_kana { name.family.hiragana }
    given_name { name.given.kanji }
    given_name_kana { name.given.hiragana }
  end

  factory :match do
    round_id { 2 }
    name { "2R 第1組" }
    match_number { 1 }
    rule_name { "MatchRule::Round2" }
  end

  factory :matching do
    match
    player
    sequence(:seat)
    status { "playing" }
    points { 0 }
    misses { 0 }
    rank { nil }
  end

  factory :question do
    text { SecureRandom.hex }
    answer { SecureRandom.hex }
    another_answer { "" }
    note { "" }
  end

  factory :question_allocation do
    match
    question
    sequence(:order) { |n| n }
  end

  factory :question_result do
    question_allocation
  end

  factory :question_player_result do
    question_result
    player
    result { 0 }
    situation { 0 }
  end

  factory :yontaku_player_result do
    player
    rank { 1 }
    score { 1 }
  end

  factory :round3_course_preference do
    player
    choice1_match { association :match }
    choice2_match { association :match }
    choice3_match { association :match }
    choice4_match { association :match }
  end
end

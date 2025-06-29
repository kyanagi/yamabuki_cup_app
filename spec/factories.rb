FactoryBot.define do
  factory :session do
    player { nil }
    ip_address { "MyString" }
    user_agent { "MyString" }
  end

  factory :player_email_credential do
    player { nil }
    sequence(:email) { |n| "#{n}@example.com" }
    password { "password123" }
    password_confirmation { "password123" }
  end

  factory :approximation_question do
    text { "MyString" }
    answer { 1 }
  end

  factory :yontaku_question do
    text { "MyString" }
    choice1 { "MyString" }
    choice2 { "MyString" }
    choice3 { "MyText" }
    choice4 { "MyText" }
    answer { 1 }
  end

  factory :approximation_quiz_answer do
    player { nil }
    answer1 { 1 }
    answer2 { 1 }
  end

  factory :question_reading do
    question { nil }
    read_duration { 1.5 }
    full_duration { 3.0 }
  end

  factory :question_provider do
    next_question { association :question }
  end

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
  end

  factory :score_operation do
    type { "" }
    match
    question_result { nil }
    player { nil }
    path { "" }
  end

  factory :question_closing do
    type { "QuestionClosing" }
    match
    question_result { nil }
    player { nil }
    question_player_results_attributes { [] }
  end

  factory :match_closing do
    type { "MatchClosing" }
    match
    question_result { nil }
    player { nil }
  end

  factory :disqualification do
    type { "Disqualification" }
    match
    question_result { nil }
    player { nil }
  end

  factory :set_transition do
    type { "SetTransition" }
    match
    question_result { nil }
    player { nil }
  end

  factory :score do
    matching
    score_operation
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

  factory :yontaku_player_paper do
    player
    paper_number { 1 }
    answers { "[]" }
  end

  factory :yontaku_player_result do
    player
    rank { 1 }
    score { 1 }
    approximation_quiz_diff1 { 0 }
    approximation_quiz_diff2 { 0 }
    sequence(:tiebreaker)
  end

  factory :round3_course_preference do
    player
    choice1_match { association :match }
    choice2_match { association :match }
    choice3_match { association :match }
    choice4_match { association :match }
  end
end

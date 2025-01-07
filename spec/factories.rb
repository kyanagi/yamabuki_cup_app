FactoryBot.define do
  factory :player

  factory :matching do
    match_id { 21 }
    player
  end

  factory :question do
    text { SecureRandom.hex }
    answer { SecureRandom.hex }
    another_answer { "" }
    note { "" }
  end

  factory :question_allocation do
    match_id { 21 }
    question
    sequence(:order) { |n| n }
  end
end

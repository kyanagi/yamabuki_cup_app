require "rails_helper"

RSpec.describe Scoreboard::SseController, type: :controller do
  describe "#stream" do
    it "SseSubscriptions を生成し、subscribe_all/unsubscribe_all を委譲する" do
      queue = Thread::Queue.new
      allow(Thread::Queue).to receive(:new).and_return(queue)

      # 対象インスタンス限定のスタブで heartbeat を抑制
      allow(controller).to receive(:start_heartbeat).with(queue).and_return(double(kill: nil))

      subs = instance_double(Scoreboard::SseSubscriptions, subscribe_all: nil, unsubscribe_all: nil)
      allow(Scoreboard::SseSubscriptions).to receive(:new).with(queue).and_return(subs)
      expect(subs).to receive(:subscribe_all)
      expect(subs).to receive(:unsubscribe_all)

      allow(queue).to receive(:pop).and_raise(IOError)

      get :stream
    end
  end
end

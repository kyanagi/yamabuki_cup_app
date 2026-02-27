module Scoreboard
  class SseWriter
    # SSE フォーマットで IO-like オブジェクトに書き込む。
    #
    # @rbs stream: IO
    # @rbs event: String
    # @rbs data: Hash[Symbol, untyped]
    # @rbs return: void
    def self.write(stream, event, data)
      stream.write("event: #{event}\n")
      stream.write("data: #{data.to_json}\n\n")
    end
  end
end

# 小芽第二章·第三方承接

=== start ===

@portrait role1 left 小芽
@portrait role2 right 当前玩家
role1: 我得把昨晚采的药送去陈老板那里。路也不远，我自己走得动的
role2: 你的伤才刚压下去。我陪你到药店
role1: 可要是路上出了事，我倒会拖慢你的
-> 接过药篓，陪小芽去药店。 => accept
-> 让小芽先在这里休息。 => decline

===

=== accept ===

@set quest_bridge_accept_decision accept
@call join_party xiao_ya
role2: 药篓给我吧。真出了事，也不是你一个人扛
role1: ……那我认路。沟边那片湿草你别踩，底下是空的
@end

===

=== decline ===

@set quest_bridge_accept_decision decline
role2: 你先把伤养稳。药店那边不急，晚些再说
role1: 好，那我缓一缓，不逞这个强
@end

===
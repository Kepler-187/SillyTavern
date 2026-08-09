# DLG 版本历史：xiao_ya/dialog_xiao_ya_ch02_accept_bridge.dlg

## V1 · 2026-08-09 20:11:23 · 初版（读取时记录）
```dlg
# 小芽第二章·第三方承接

=== start ===

@portrait role1 left 小芽
@portrait role2 right 当前玩家
role1: 我得把昨晚采的药送去陈老板那里。路不远，我自己能走。
role2: 你的伤才刚压下去。我陪你到药店。
role1: 要是路上有事，我会拖慢你。
-> 接过药篓，陪小芽去药店。 => accept
-> 让小芽先在这里休息。 => decline

===

=== accept ===

@set quest_bridge_accept_decision accept
@call join_party xiao_ya
role2: 药篓给我。真有事，也不是你一个人扛。
role1: ……那我认路。你别踩沟边那片湿草，下面是空的。
@end

===

=== decline ===

@set quest_bridge_accept_decision decline
role2: 你先把伤养稳。药店那边，晚些再说。
role1: 好。我缓一缓，不逞这个强。
@end

===
```

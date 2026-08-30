# DLG 版本历史：xiao_ya/dialog_xiao_ya_ch03_sc020_accept_bridge.dlg.dlg

## V1 · 2026-08-31 02:11:26 · 初版（落盘前原稿）
```dlg
# 小芽第三章·第三方承接

=== start ===

@portrait role1 left 小芽
@portrait role2 right 当前玩家
role1: 药还在，可村里已经没有能收的人了。我想去官道看看，或许有行商经过。
role2: 官道不太平，我陪你去。
-> 接过药篓，陪小芽去官道。 => accept
-> 让小芽独自去找行商。 => decline

===

=== accept ===

@set quest_bridge_accept_decision accept
@call join_party xiao_ya
role1: 那就一起走。药篓我背着，路你帮我看着。
@end

===

=== decline ===

@set quest_bridge_accept_decision decline
role2: 你先别冒险，等路上安稳些再说。
role1: 好。我不逞强，先在村口等消息。
@end

===
```

## V2 · 2026-08-31 02:11:26 · 第 4 轮框架重写（文心执笔·用户终审）
```dlg
=== start ===

@portrait role1 left 小芽
@portrait role2 right 当前玩家
> 晌午，村口门槛边，风里一股苦药味。

role1: 药篓我捆好了，村里是真没人收。我等不得了，这就去官道守着，总该能碰上过路的行商吧？
role2: 官道上有狼，我陪你走一趟
-> 接过药篓，陪小芽去官道。 => accept
-> 让小芽独自去找行商。 => decline

===

=== accept ===

@set quest_bridge_accept_decision accept
@call join_party xiao_ya
role1: 嗯，两个人一道稳当。药篓我背着，路你帮我看着——狼要是来了就喊我！
@end

===

=== decline ===

@set quest_bridge_accept_decision decline
role2: 你先别冒险，等路上安稳些再说
role1: 行吧，我不逞强。就是药再压几日就真砸手里了——你可得帮我盯着点风声。
@end

===
```

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

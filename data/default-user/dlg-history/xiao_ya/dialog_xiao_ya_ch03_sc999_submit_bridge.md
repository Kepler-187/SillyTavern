# DLG 版本历史：xiao_ya/dialog_xiao_ya_ch03_sc999_submit_bridge.dlg.dlg

## V1 · 2026-08-31 02:11:26 · 初版（落盘前原稿）
```dlg
# 小芽第三章·第三方收束

=== start ===

@portrait role1 left 小芽
@portrait role2 right 当前玩家
role1: 通远商行答应带我去落霞镇。药篓、针和这点行李，够我重新开始。
role2: 这回是你自己选的路。
role1: 嗯。谢谢你陪我走到这里。接下来，我得跟着商队走了。
@call leave_party xiao_ya
@end

===
```

## V2 · 2026-08-31 02:11:26 · 第 4 轮框架重写（文心执笔·用户终审）
```dlg
=== start ===

@portrait role1 left 小芽
@portrait role2 right 当前玩家
> 掌灯前，村口，歇脚的车队占了半条路。

role1: 哟，来得正好——明早我就跟车队去落霞镇了。药篓、金针，再有几枚铜板，家当全在这儿，数得清呢
role2: 这回的路，是你自己挑的
role1: 嗯，多谢这一路照应——往后商路上碰见了，可别装不认得。我得去归置行李了。
@call leave_party xiao_ya
@end

===
```

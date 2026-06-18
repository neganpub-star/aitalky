-- 席位包单价对齐参考:$30/月 → $20/月(订阅弹窗/加购席位均按此单价折算)
UPDATE `pf_addon_pack` SET `price` = 20.00000000, `update_time` = NOW()
WHERE `code` = 'pack_seat_1';

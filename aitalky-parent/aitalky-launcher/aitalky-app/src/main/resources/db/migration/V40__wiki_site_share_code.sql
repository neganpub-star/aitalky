-- Flyway V40: wiki 站点对外公开标识 share_code
-- 对外站点(E)用:站点首页/分类页公开访问以 share_code 定位(无需登录、跳过租户过滤);
-- subdomain 作为可选的"美化路径",share_code 作为始终存在的稳定标识(同文章 shareCode 思路)。
ALTER TABLE `wiki_site`
    ADD COLUMN `share_code` VARCHAR(16) NULL COMMENT '站点对外公开标识(base62);预览/分享/对外站点路由用' AFTER `project_id`;

-- 存量站点回填(10位;新站点由后端生成 base62)
UPDATE `wiki_site` SET `share_code` = LEFT(MD5(CONCAT(`id`, RAND())), 10) WHERE `share_code` IS NULL OR `share_code` = '';

-- 全局唯一(对外标识)
CREATE UNIQUE INDEX `uk_site_share_code` ON `wiki_site` (`share_code`);

-- Flyway V39: wiki 文章短码(对齐参考:文章ID 展示为短字符串如 AQuXRYS0SL,而非雪花长数字)
-- 短码创建时由后端生成(base62, 10位);雪花 id 仍为内部主键/接口参数。
ALTER TABLE `wiki_article`
    ADD COLUMN `code` VARCHAR(16) NULL COMMENT '文章短码(对外展示的文章ID,base62)' AFTER `project_id`;

-- 存量文章回填短码(10位十六进制,够用且唯一;新文章由后端生成 base62)
UPDATE `wiki_article` SET `code` = LEFT(MD5(CONCAT(`id`, RAND())), 10) WHERE `code` IS NULL OR `code` = '';

-- 项目内唯一(同 shareCode 一样,短码也作对外标识)
CREATE UNIQUE INDEX `uk_article_code` ON `wiki_article` (`code`);

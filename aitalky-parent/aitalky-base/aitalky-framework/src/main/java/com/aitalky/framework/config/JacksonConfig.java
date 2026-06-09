package com.aitalky.framework.config;

import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import com.fasterxml.jackson.datatype.jsr310.deser.LocalDateTimeDeserializer;
import com.fasterxml.jackson.datatype.jsr310.deser.LocalDateDeserializer;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalDateTimeSerializer;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalDateSerializer;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Jackson 全局配置(统一序列化口径)。
 * <ul>
 *   <li><b>Long → 字符串</b>:雪花ID 为 19 位 bigint,超过 JS 安全整数(2^53),统一字符串下发防丢精度。</li>
 *   <li><b>时间格式统一</b>:LocalDateTime→{@code yyyy-MM-dd HH:mm:ss}、LocalDate→{@code yyyy-MM-dd},
 *       前后端时间口径一致,避免后期一处处改格式。</li>
 * </ul>
 */
@Configuration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class JacksonConfig {

    private static final DateTimeFormatter DATETIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    @Bean
    public Jackson2ObjectMapperBuilderCustomizer aitalkyJacksonCustomizer() {
        return builder -> builder
                // 雪花ID 等 Long 转字符串
                .serializerByType(Long.class, ToStringSerializer.instance)
                .serializerByType(Long.TYPE, ToStringSerializer.instance)
                // 时间格式统一
                .serializers(new LocalDateTimeSerializer(DATETIME), new LocalDateSerializer(DATE))
                .deserializers(new LocalDateTimeDeserializer(DATETIME), new LocalDateDeserializer(DATE));
    }
}

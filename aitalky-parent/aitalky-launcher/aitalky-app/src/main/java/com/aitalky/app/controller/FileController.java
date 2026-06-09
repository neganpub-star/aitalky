package com.aitalky.app.controller;

import com.aitalky.common.api.R;
import com.aitalky.framework.storage.MinioService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * 文件上传接口(头像/图片消息用)。
 * <p>需登录:默认被 AuthInterceptor 拦截(/api/** 未在放行清单);校验/存储交由 MinioService。
 */
@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private final MinioService minioService;

    /** 上传文件(multipart),返回可访问 URL */
    @PostMapping("/upload")
    public R<String> upload(@RequestParam("file") MultipartFile file) {
        return R.ok(minioService.upload(file));
    }
}

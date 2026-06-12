package com.aitalky.identity.support;

/**
 * 新成员默认头像(对齐参考系统:成员建好即有头像)。
 * <p>用 DiceBear 公共服务按成员ID稳定生成,免自建图床;同一成员每次URL相同,不同成员不同。
 * 上线如需自托管/换风格,改这里的 BASE/STYLE 即可。
 */
public final class DefaultAvatar {

    private DefaultAvatar() {
    }

    private static final String BASE = "https://api.dicebear.com/9.x";
    private static final String STYLE = "avataaars"; // 卡通人像风格,接近"真人头像"观感

    /** 按成员ID生成稳定的默认头像 URL */
    public static String urlFor(Long memberId) {
        return BASE + "/" + STYLE + "/svg?seed=" + memberId;
    }
}

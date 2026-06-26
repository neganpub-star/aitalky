-- Flyway V41: 将 V2 占位协议正文替换为正式法律文本
-- 为何独立迁移:V2 占位数据已落库,直接改 V2 不会重跑且会破坏 checksum;此处用 UPDATE 按 (type,language) 幂等覆盖正文。
-- 适用范围:三件套(terms 服务条款 / privacy 隐私政策 / subscription 套餐订阅服务协议) × zh_CN/en_US。
-- 合规口径:中文版以《个人信息保护法》《数据安全法》《网络安全法》为主;英文版以 GDPR/CCPA 作国际通用表述。
-- 主体署名:aitalky(运营方);对外联系 support@aitalky.com、隐私事务 privacy@aitalky.com。
-- 注意:内容为 HTML 富文本,前端经 DOMPurify 过滤后渲染;ASCII 单引号在英文文本中一律规避以保 SQL 安全。
SET NAMES utf8mb4;

-- ========================= 服务条款 Terms of Service =========================

UPDATE `pf_agreement` SET `title`='服务条款', `version`='v1.0', `update_time`=NOW(), `content`=
'<h2>aitalky 服务条款</h2>
<p>最近更新:2026年6月。欢迎使用 aitalky(以下简称“本平台”或“我们”)。本服务条款(以下简称“本条款”)是您(以下简称“您”或“客户”,指注册并使用本平台的企业或个人)与 aitalky 运营方之间就使用本平台多租户智能客服 SaaS 服务所订立的具有法律约束力的协议。请您在注册或使用前完整阅读本条款;一旦您点击同意、注册账户或实际使用本服务,即视为您已阅读、理解并同意接受本条款全部内容。</p>

<h3>一、定义</h3>
<ul>
<li><strong>本平台 / 服务</strong>:指 aitalky 提供的多租户智能客服 SaaS,含坐席控制台、信使端(终端访客聊天窗)、会话与消息处理、知识库、AI 辅助能力(如智能翻译、智能回复)及相关功能。</li>
<li><strong>客户</strong>:指开通租户(项目)并使用本服务的企业或个人,亦为终端访客个人信息的“个人信息处理者/数据控制者”。</li>
<li><strong>坐席成员</strong>:指客户授权登录坐席控制台、占用席位的工作人员。</li>
<li><strong>终端访客</strong>:指通过信使端与客户进行咨询、对话的最终用户。</li>
<li><strong>客户数据</strong>:指客户及其坐席成员、终端访客在使用本服务过程中产生或上传的会话消息、联系人、知识库内容等数据。</li>
</ul>

<h3>二、账户与坐席席位</h3>
<ul>
<li>您须提供真实、准确、完整的注册信息(邮箱等),并对账户下的全部活动负责。</li>
<li>本平台采用邮箱+密码并辅以邮箱验证码的二次验证登录;您应妥善保管账户凭证,不得转让、出借账户。如发现账户被盗用或存在安全风险,应立即通知我们。</li>
<li>坐席席位数量受您所订阅套餐及扩展包限制,新增坐席成员不得超过您的可用席位额度。</li>
<li>多租户隔离:不同客户的数据在系统层面相互隔离,您不得尝试访问、干扰其他租户的数据或服务。</li>
</ul>

<h3>三、服务内容与可用性</h3>
<ul>
<li>我们按订阅套餐向您提供相应功能与资源配额(席位、翻译额度、客户配额、公网文章/建站点配额等)。具体计费与配额另见《套餐订阅服务协议》。</li>
<li>我们将尽商业上合理的努力保障服务持续可用,但不承诺服务永不中断;计划内维护将尽量提前通知。</li>
<li>AI 辅助能力(翻译、智能回复等)依赖模型推理,结果可能存在偏差,仅供辅助参考,不构成专业建议,最终判断与回复由您及坐席成员负责。</li>
</ul>

<h3>四、使用规范</h3>
<p>您及您的坐席成员、终端访客在使用本服务时,不得从事下列行为:</p>
<ul>
<li>违反法律法规、公序良俗,或侵害他人合法权益(含知识产权、隐私权、名誉权等);</li>
<li>发送垃圾信息、欺诈信息、恶意骚扰或违法违规内容;</li>
<li>上传含病毒、木马等恶意程序的文件;</li>
<li>未经授权访问、扫描、探测、攻击本平台系统,或绕过、破坏本平台的安全机制、配额与计费机制;</li>
<li>利用本服务从事任何违法犯罪活动,或将服务转售、再许可给未获授权的第三方。</li>
</ul>
<p>如您违反上述规范,我们有权视情节采取警告、限制功能、暂停或终止服务等措施,且无需就此承担违约责任。</p>

<h3>五、客户数据与各方责任</h3>
<ul>
<li>就终端访客的个人信息,<strong>客户为个人信息处理者(数据控制者),aitalky 为受托处理方(数据处理者)</strong>,仅依据客户的指示及本条款、《隐私政策》约定的目的处理客户数据。</li>
<li>您应确保收集、上传、处理客户数据已获得合法授权,并已就个人信息处理向终端访客履行告知与取得同意等义务,合法合规由您负责。</li>
<li>您对客户数据的内容合法性负责;客户数据的所有权及相关权利归您或合法权利人所有,本平台不主张其所有权。</li>
<li>我们将依照《隐私政策》及适用法律采取合理的安全措施保护客户数据。</li>
</ul>

<h3>六、知识产权</h3>
<p>本平台及其软件、界面、商标、文档等相关知识产权均归 aitalky 运营方或相应权利人所有。除为正常使用本服务之必要,未经书面许可,您不得复制、修改、反向工程、传播或以其他方式使用上述内容。客户数据的知识产权不因使用本服务而转移给我们。</p>

<h3>七、第三方服务</h3>
<p>本服务可能集成第三方服务(如邮件发送、对象存储、支付、AI 模型提供方等)。该等第三方服务由其各自提供方依其条款提供,我们对不可归责于我们的第三方服务问题不承担责任。</p>

<h3>八、免责声明与责任限制</h3>
<ul>
<li>本服务按“现状”及“可获得”状态提供。在法律允许的最大范围内,我们不对服务的适销性、特定用途适用性作出默示担保。</li>
<li>在法律允许的最大范围内,我们对因使用或无法使用本服务造成的间接、附带、惩罚性损失或数据/利润损失不承担责任;我们的累计赔偿责任以您在主张发生前 12 个月内就本服务实际支付的费用为上限。</li>
<li>因不可抗力、第三方网络/电力故障、黑客攻击等非我们可合理控制原因导致的服务中断或数据损失,我们在法律允许范围内免责。</li>
</ul>

<h3>九、服务的变更、中止与终止</h3>
<ul>
<li>我们可根据运营需要对服务功能进行更新、调整,重大变更将通过平台公告或邮件通知。</li>
<li>您可随时停止使用本服务并申请注销账户;订阅相关的退款、到期处理见《套餐订阅服务协议》。</li>
<li>服务终止后,我们将按适用法律及《隐私政策》约定的留存期处理或删除客户数据;您应及时导出所需数据。</li>
</ul>

<h3>十、条款的修改</h3>
<p>我们可不时修订本条款,修订后将更新版本号并在平台内公示;重大变更会以显著方式提示。修订生效后您继续使用本服务的,视为接受修订内容。</p>

<h3>十一、适用法律与争议解决</h3>
<p>本条款的订立、效力、解释与争议解决均适用中华人民共和国大陆地区法律(不含冲突法规则)。因本条款产生的争议,双方应先友好协商;协商不成的,任一方可提交 aitalky 运营方所在地有管辖权的人民法院诉讼解决。如您在中国大陆以外地区使用本服务,还应遵守所在地适用法律。</p>

<h3>十二、联系我们</h3>
<p>如对本条款有任何疑问,请通过 support@aitalky.com 与我们联系。</p>'
WHERE `type`='terms' AND `language`='zh_CN';

UPDATE `pf_agreement` SET `title`='Terms of Service', `version`='v1.0', `update_time`=NOW(), `content`=
'<h2>aitalky Terms of Service</h2>
<p>Last updated: June 2026. Welcome to aitalky (the “Platform”, “we”, or “us”). These Terms of Service (the “Terms”) form a legally binding agreement between you (the “Customer” or “you”, meaning the business or individual that registers for and uses the Platform) and the operator of aitalky, governing your use of the aitalky multi-tenant intelligent customer-service SaaS. Please read these Terms carefully before registering or using the service. By clicking to accept, registering an account, or using the service, you acknowledge that you have read, understood, and agreed to be bound by these Terms.</p>

<h3>1. Definitions</h3>
<ul>
<li><strong>Platform / Service</strong>: the multi-tenant intelligent customer-service SaaS provided by aitalky, including the agent console, the messenger end (the end-visitor chat widget), conversation and message processing, the knowledge base, AI-assisted capabilities (such as smart translation and smart replies), and related features.</li>
<li><strong>Customer</strong>: the business or individual that activates a tenant (project) and uses the service, and who acts as the personal-information handler / data controller of end-visitor personal information.</li>
<li><strong>Agent member</strong>: a staff member authorized by the Customer to log in to the agent console and occupy a seat.</li>
<li><strong>End visitor</strong>: the end user who consults or converses with the Customer through the messenger end.</li>
<li><strong>Customer Data</strong>: conversation messages, contacts, knowledge-base content, and other data generated or uploaded by the Customer, its agent members, and end visitors while using the service.</li>
</ul>

<h3>2. Account and Agent Seats</h3>
<ul>
<li>You must provide true, accurate, and complete registration information (such as an email address) and are responsible for all activity under your account.</li>
<li>The Platform uses email and password login with email verification code as a second factor. You must safeguard your credentials and must not transfer or lend your account. Notify us immediately if you discover unauthorized use or any security risk.</li>
<li>The number of agent seats is limited by your subscribed plan and add-on packs. You may not add agent members beyond your available seat quota.</li>
<li>Multi-tenant isolation: the data of different Customers is isolated at the system level. You must not attempt to access or interfere with the data or service of any other tenant.</li>
</ul>

<h3>3. Service Content and Availability</h3>
<ul>
<li>We provide features and resource quotas (seats, translation allowance, customer quota, public article / hosted-site quota, and so on) according to your subscribed plan. Billing and quota details are set out in the Subscription Agreement.</li>
<li>We will use commercially reasonable efforts to keep the service available but do not warrant uninterrupted operation. We will endeavor to give advance notice of scheduled maintenance.</li>
<li>AI-assisted capabilities (translation, smart replies, and the like) rely on model inference, may contain errors, and are provided for reference only. They do not constitute professional advice; final judgment and replies remain the responsibility of you and your agent members.</li>
</ul>

<h3>4. Acceptable Use</h3>
<p>You, your agent members, and end visitors must not, when using the service:</p>
<ul>
<li>violate any laws, regulations, or public morals, or infringe the lawful rights of others (including intellectual-property, privacy, and reputation rights);</li>
<li>send spam, fraudulent messages, malicious harassment, or unlawful content;</li>
<li>upload files containing viruses, trojans, or other malicious programs;</li>
<li>access, scan, probe, or attack the Platform without authorization, or circumvent or break the Platform security, quota, or billing mechanisms;</li>
<li>use the service for any unlawful activity, or resell or sublicense the service to unauthorized third parties.</li>
</ul>
<p>If you breach these rules, we may, depending on the severity, issue warnings, restrict features, or suspend or terminate the service, without liability for doing so.</p>

<h3>5. Customer Data and Responsibilities</h3>
<ul>
<li>With respect to end-visitor personal information, <strong>the Customer is the personal-information handler (data controller) and aitalky is the entrusted party (data processor)</strong>, processing Customer Data only on the Customer instructions and for the purposes set out in these Terms and the Privacy Policy.</li>
<li>You must ensure that the collection, upload, and processing of Customer Data is duly authorized, and that you have given notice to and obtained consent from end visitors as required. Lawful compliance is your responsibility.</li>
<li>You are responsible for the lawfulness of Customer Data content. Ownership of and rights in Customer Data belong to you or the lawful rights holder; the Platform does not claim ownership of it.</li>
<li>We will take reasonable security measures to protect Customer Data in accordance with the Privacy Policy and applicable law.</li>
</ul>

<h3>6. Intellectual Property</h3>
<p>All intellectual-property rights in the Platform and its software, interfaces, trademarks, and documentation belong to the operator of aitalky or the respective rights holders. Except as necessary for normal use of the service, you must not copy, modify, reverse-engineer, distribute, or otherwise use such materials without written permission. Intellectual-property rights in Customer Data do not transfer to us by reason of your use of the service.</p>

<h3>7. Third-Party Services</h3>
<p>The service may integrate third-party services (such as email delivery, object storage, payment, and AI model providers). Such third-party services are provided by their respective providers under their own terms, and we are not liable for third-party service issues not attributable to us.</p>

<h3>8. Disclaimers and Limitation of Liability</h3>
<ul>
<li>The service is provided on an “as is” and “as available” basis. To the maximum extent permitted by law, we disclaim implied warranties of merchantability and fitness for a particular purpose.</li>
<li>To the maximum extent permitted by law, we are not liable for indirect, incidental, or punitive damages or loss of data or profits arising from use or inability to use the service. Our aggregate liability is capped at the fees you actually paid for the service in the 12 months preceding the claim.</li>
<li>We are not liable, to the extent permitted by law, for service interruption or data loss caused by force majeure, third-party network or power failures, hacking, or other causes beyond our reasonable control.</li>
</ul>

<h3>9. Changes, Suspension, and Termination</h3>
<ul>
<li>We may update or adjust service features as needed for operations; material changes will be announced on the Platform or by email.</li>
<li>You may stop using the service at any time and request account deletion. Refunds and end-of-term handling related to subscriptions are set out in the Subscription Agreement.</li>
<li>After termination, we will handle or delete Customer Data in accordance with applicable law and the retention period set out in the Privacy Policy. You should export any data you need in a timely manner.</li>
</ul>

<h3>10. Amendments</h3>
<p>We may revise these Terms from time to time, updating the version number and publishing the revision on the Platform; material changes will be highlighted. Your continued use of the service after the revision takes effect constitutes acceptance.</p>

<h3>11. Governing Law and Disputes</h3>
<p>These Terms are governed by and construed under the laws of the mainland of the People Republic of China (excluding conflict-of-law rules). Disputes arising from these Terms shall first be resolved through friendly negotiation; failing that, either party may bring proceedings before the competent people court at the location of the aitalky operator. If you use the service outside mainland China, you must also comply with applicable local laws.</p>

<h3>12. Contact Us</h3>
<p>If you have any questions about these Terms, please contact us at support@aitalky.com.</p>'
WHERE `type`='terms' AND `language`='en_US';

-- ========================= 隐私政策 Privacy Policy =========================

UPDATE `pf_agreement` SET `title`='隐私政策', `version`='v1.0', `update_time`=NOW(), `content`=
'<h2>aitalky 隐私政策</h2>
<p>最近更新:2026年6月。aitalky(以下简称“本平台”或“我们”)非常重视隐私与个人信息保护。本隐私政策说明我们在您使用多租户智能客服服务过程中如何收集、使用、存储、共享和保护信息,以及您享有的权利。请您在使用前仔细阅读。本政策适用于本平台坐席控制台、信使端及相关服务。</p>

<h3>一、我们的双重角色</h3>
<ul>
<li>就客户(坐席企业)的账户与坐席成员信息,我们作为<strong>个人信息处理者(数据控制者)</strong>,依本政策处理。</li>
<li>就终端访客在信使端产生的会话消息等数据,<strong>客户为个人信息处理者(数据控制者),我们为受托处理方(数据处理者)</strong>,仅按客户指示及为提供服务之目的处理,相关收集与告知由客户负责。</li>
</ul>

<h3>二、我们收集的信息</h3>
<ul>
<li><strong>账户与坐席信息</strong>:注册邮箱、密码(加密存储)、坐席成员的昵称、头像、角色与工作状态等。</li>
<li><strong>业务运营信息</strong>:租户(项目)配置、知识库内容、订阅与订单信息等。</li>
<li><strong>会话与消息内容</strong>:坐席与终端访客之间的消息、附件、联系人及发送者快照(发送时刻的昵称/头像)。</li>
<li><strong>日志与设备信息</strong>:访问日志、IP 地址、浏览器与设备类型、操作记录等,用于安全风控与服务改进。</li>
<li><strong>Cookie 与同类技术</strong>:用于维持登录态、保存语言/主题偏好。</li>
</ul>

<h3>三、我们如何使用信息</h3>
<ul>
<li>提供、维护并改进客服服务,实现登录鉴权、会话路由、消息投递、AI 翻译与智能回复等功能;</li>
<li>进行账户与坐席席位管理、订阅计费与配额核算;</li>
<li>保障账户与平台安全,进行验证码发送防刷、异常检测与防欺诈;</li>
<li>在取得必要同意或符合法律规定的情形下,向您发送服务通知。</li>
</ul>

<h3>四、受托处理终端访客数据</h3>
<p>我们仅依客户指示处理终端访客数据,不将其用于客户授权目的以外的用途,不对外出售。会话消息存储于受控数据库(如 MongoDB),并采用访问控制与多租户隔离。客户有权要求我们协助其履行对终端访客的个人信息保护义务。</p>

<h3>五、Cookie 与同类技术</h3>
<p>我们使用必要 Cookie 维持会话与偏好设置。您可通过浏览器设置管理或清除 Cookie,但禁用部分 Cookie 可能影响登录与功能使用。</p>

<h3>六、信息的共享与委托</h3>
<p>我们不会出售您的个人信息。仅在下列情形共享或委托处理,并要求对方履行同等保护义务:</p>
<ul>
<li><strong>服务提供方</strong>:邮件发送(SMTP)、对象存储、支付处理、AI 模型推理(如翻译/智能回复)等为提供服务所必需的供应商;</li>
<li><strong>法律要求</strong>:依法律法规、监管或司法机关的合法要求而披露;</li>
<li><strong>取得同意</strong>:经您或相关权利人明确同意的其他情形。</li>
</ul>

<h3>七、跨境数据传输</h3>
<p>如服务涉及向中国大陆境外提供个人信息,我们将依《个人信息保护法》等规定履行安全评估、单独同意或采用标准合同等合规要求。面向国际客户时,我们将参照 GDPR、CCPA 等适用框架提供相应保护。</p>

<h3>八、数据存储与安全</h3>
<ul>
<li>密码等敏感凭证采用不可逆加密(如 BCrypt)存储,绝不明文记录或打印日志;</li>
<li>采用传输加密、访问控制、最小权限、操作审计等措施保护数据;</li>
<li><strong>留存期限</strong>:在为实现处理目的所必需且法律要求的期限内保存;超出后将删除或匿名化。账户注销或服务终止后,我们按适用法律处理或删除相应数据。</li>
</ul>

<h3>九、您的权利</h3>
<p>在适用法律(《个人信息保护法》等)框架下,您及终端访客就个人信息享有下列权利:</p>
<ul>
<li>查询、复制、更正、补充个人信息;</li>
<li>在法定情形下删除个人信息;</li>
<li>撤回此前作出的同意;</li>
<li>注销账户;</li>
<li>就个人信息处理活动进行投诉。</li>
</ul>
<p>终端访客如需行使权利,通常应向作为数据控制者的客户提出;我们将依约提供必要协助。您可通过 privacy@aitalky.com 联系我们行使相关权利。</p>

<h3>十、未成年人保护</h3>
<p>本服务面向企业用户及其授权坐席成员,不面向未满 14 周岁的儿童。若您认为我们可能误收集了儿童个人信息,请及时联系我们删除。</p>

<h3>十一、政策更新</h3>
<p>我们可能适时更新本政策并更新版本号。重大变更将通过平台公告或邮件显著提示;更新生效后您继续使用本服务的,视为接受更新内容。</p>

<h3>十二、联系我们</h3>
<p>如对本隐私政策或个人信息保护有任何疑问、意见或投诉,请通过 privacy@aitalky.com 与我们联系。</p>'
WHERE `type`='privacy' AND `language`='zh_CN';

UPDATE `pf_agreement` SET `title`='Privacy Policy', `version`='v1.0', `update_time`=NOW(), `content`=
'<h2>aitalky Privacy Policy</h2>
<p>Last updated: June 2026. aitalky (the “Platform”, “we”, or “us”) takes privacy and personal-information protection seriously. This Privacy Policy explains how we collect, use, store, share, and protect information when you use the multi-tenant intelligent customer-service service, and the rights you have. Please read it carefully before use. This policy applies to the agent console, the messenger end, and related services.</p>

<h3>1. Our Dual Role</h3>
<ul>
<li>For the account and agent-member information of Customers (the agent businesses), we act as the <strong>personal-information handler (data controller)</strong> and process it under this policy.</li>
<li>For conversation messages and similar data generated by end visitors on the messenger end, <strong>the Customer is the personal-information handler (data controller) and we are the entrusted party (data processor)</strong>, processing only on the Customer instructions and for the purpose of providing the service. The related collection and notice obligations rest with the Customer.</li>
</ul>

<h3>2. Information We Collect</h3>
<ul>
<li><strong>Account and agent information</strong>: registration email, password (stored encrypted), and the nickname, avatar, role, and work status of agent members.</li>
<li><strong>Operational information</strong>: tenant (project) configuration, knowledge-base content, subscription and order information.</li>
<li><strong>Conversation and message content</strong>: messages, attachments, contacts, and sender snapshots (nickname/avatar at the time of sending) between agents and end visitors.</li>
<li><strong>Logs and device information</strong>: access logs, IP address, browser and device type, and operation records, used for security risk control and service improvement.</li>
<li><strong>Cookies and similar technologies</strong>: used to maintain login state and store language/theme preferences.</li>
</ul>

<h3>3. How We Use Information</h3>
<ul>
<li>to provide, maintain, and improve the customer-service offering, enabling login authentication, conversation routing, message delivery, AI translation, and smart replies;</li>
<li>to manage accounts and agent seats and to handle subscription billing and quota accounting;</li>
<li>to safeguard account and platform security, including anti-abuse controls on verification-code sending, anomaly detection, and fraud prevention;</li>
<li>to send service notices where we have the necessary consent or a legal basis to do so.</li>
</ul>

<h3>4. Processing of End-Visitor Data on Entrustment</h3>
<p>We process end-visitor data only on the Customer instructions, do not use it for purposes beyond what the Customer authorizes, and do not sell it. Conversation messages are stored in controlled databases (such as MongoDB) with access control and multi-tenant isolation. The Customer may require us to assist in fulfilling its personal-information obligations toward end visitors.</p>

<h3>5. Cookies and Similar Technologies</h3>
<p>We use necessary cookies to maintain sessions and preferences. You can manage or clear cookies through your browser settings, but disabling some cookies may affect login and functionality.</p>

<h3>6. Sharing and Entrustment</h3>
<p>We do not sell your personal information. We share or entrust processing only in the following cases, and require recipients to undertake equivalent protection obligations:</p>
<ul>
<li><strong>Service providers</strong>: vendors necessary to provide the service, such as email delivery (SMTP), object storage, payment processing, and AI model inference (for example translation and smart replies);</li>
<li><strong>Legal requirements</strong>: disclosure as required by laws, regulations, or lawful requests of regulatory or judicial authorities;</li>
<li><strong>With consent</strong>: other cases with the explicit consent of you or the relevant rights holder.</li>
</ul>

<h3>7. Cross-Border Data Transfers</h3>
<p>Where the service involves providing personal information outside mainland China, we will meet compliance requirements under the Personal Information Protection Law and related rules, such as security assessment, separate consent, or standard contracts. For international Customers, we provide protections consistent with applicable frameworks such as the GDPR and the CCPA.</p>

<h3>8. Storage and Security</h3>
<ul>
<li>Sensitive credentials such as passwords are stored using irreversible encryption (such as BCrypt) and are never recorded or logged in plaintext;</li>
<li>we protect data through transport encryption, access control, least privilege, and operation auditing;</li>
<li><strong>Retention</strong>: we retain information only for as long as necessary to fulfil the processing purposes and as required by law, after which it is deleted or anonymized. After account deletion or service termination, we handle or delete the relevant data in accordance with applicable law.</li>
</ul>

<h3>9. Your Rights</h3>
<p>Under applicable law (such as the Personal Information Protection Law), you and end visitors have the following rights regarding personal information:</p>
<ul>
<li>to access, copy, correct, and supplement personal information;</li>
<li>to delete personal information in statutory circumstances;</li>
<li>to withdraw consent previously given;</li>
<li>to delete your account;</li>
<li>to lodge complaints about personal-information processing activities.</li>
</ul>
<p>End visitors wishing to exercise their rights should generally direct requests to the Customer acting as data controller; we will provide necessary assistance as agreed. You may contact us at privacy@aitalky.com to exercise your rights.</p>

<h3>10. Protection of Minors</h3>
<p>The service is intended for business users and their authorized agent members and is not directed at children under the age of 14. If you believe we may have inadvertently collected a child personal information, please contact us promptly so we can delete it.</p>

<h3>11. Updates to This Policy</h3>
<p>We may update this policy from time to time and update the version number. Material changes will be prominently announced on the Platform or by email; your continued use after an update takes effect constitutes acceptance.</p>

<h3>12. Contact Us</h3>
<p>If you have any questions, comments, or complaints about this Privacy Policy or personal-information protection, please contact us at privacy@aitalky.com.</p>'
WHERE `type`='privacy' AND `language`='en_US';

-- ========================= 套餐订阅服务协议 Subscription Agreement =========================

UPDATE `pf_agreement` SET `title`='套餐订阅服务协议', `version`='v1.0', `update_time`=NOW(), `content`=
'<h2>aitalky 套餐订阅服务协议</h2>
<p>最近更新:2026年6月。本《套餐订阅服务协议》(以下简称“本协议”)是您与 aitalky 运营方之间就订阅、购买与使用本平台付费套餐及扩展包所订立的协议,与《服务条款》《隐私政策》共同构成完整约定。订阅前请仔细阅读;完成下单支付即视为您接受本协议。</p>

<h3>一、订阅套餐与扩展包</h3>
<ul>
<li>本平台提供不同档位的订阅套餐(如基础版、标准版、专业版),各套餐包含相应功能与资源配额(坐席席位、翻译额度、客户配额、公网文章/建站点配额等)。</li>
<li>除基础套餐外,您可按需购买<strong>扩展包</strong>(如翻译扩展包、AI Tokens 扩展包、坐席席位扩展包)以提升对应资源额度。</li>
<li>各套餐与扩展包的功能、配额与价格以下单页面实际展示为准,我们可适时调整产品组合。</li>
</ul>

<h3>二、计费与起订周期</h3>
<ul>
<li>订阅以订阅周期(如按月)计费,部分套餐设有最短起订周期(如 6 个月),具体以套餐说明为准。</li>
<li>计费金额、币种(如 USD)及税费以下单时页面展示为准;金额计算以高精度数值处理,避免精度误差。</li>
<li>扩展包按其计价方式(按额度、按席位或一次性)计费。</li>
</ul>

<h3>三、订单与支付</h3>
<ul>
<li>您应通过本平台指定的支付渠道完成支付;订单在我们确认收款后生效。</li>
<li>支付币种以下单时所选为准;因汇率、支付通道产生的差异由相应规则处理。</li>
<li>请您核对订单信息后再行支付;支付成功后对应权益将按套餐生效。</li>
</ul>

<h3>四、续费与到期</h3>
<ul>
<li>订阅到期后,如未续费,相关付费功能与超出免费额度的资源将停止提供,但已产生的客户数据按《隐私政策》留存规则处理。</li>
<li>若开启自动续费,我们将在到期前按约定周期与价格扣费;您可在到期前关闭自动续费。</li>
<li>到期或降级后,若您的实际用量(如已发布文章数、站点数、坐席数)超出新额度,相关功能可能受限,您应自行调整至额度范围内。</li>
</ul>

<h3>五、配额与用量</h3>
<ul>
<li>各项资源(席位、翻译字符、客户配额、公网文章/站点配额、AI Tokens 等)按套餐与扩展包核定额度使用,超出额度的操作将被限制,直至您升级套餐或购买扩展包。</li>
<li>配额用量以平台后台核算为准。您不得通过技术手段规避或破坏配额与计费机制。</li>
</ul>

<h3>六、升级、降级与变更</h3>
<ul>
<li>您可在订阅期内升级套餐或加购扩展包,新增权益即时生效;费用按相应规则计算。</li>
<li>降级一般于下一订阅周期生效;降级可能导致部分功能或额度减少,由此产生的影响由您评估并承担。</li>
</ul>

<h3>七、退款政策</h3>
<ul>
<li>除法律强制规定或我们书面另行承诺外,已订阅并开通的服务费用原则上<strong>不予退还</strong>。</li>
<li>因我们原因导致服务长期不可用且无法修复的,您可就受影响周期申请合理的费用补偿或按比例退款。</li>
<li>因您违反《服务条款》被暂停或终止服务的,已付费用不予退还。</li>
</ul>

<h3>八、逾期与服务暂停</h3>
<p>如订阅到期未续费或自动续费扣款失败,我们可暂停相应付费功能。暂停期间产生的影响由您承担;您完成续费后,我们将在合理时间内恢复相应服务。</p>

<h3>九、价格调整</h3>
<p>我们可根据运营需要调整套餐与扩展包价格,价格调整不影响您当前已生效订阅周期内的价格;调整将在续费或新订单时适用,并提前公示。</p>

<h3>十、协议终止</h3>
<p>您可停止续费以终止订阅。我们在您严重违反《服务条款》或本协议时,有权暂停或终止向您提供付费服务。协议终止后,数据处理按《隐私政策》执行。</p>

<h3>十一、适用法律与争议解决</h3>
<p>本协议适用中华人民共和国大陆地区法律。因本协议产生的争议,双方应先友好协商;协商不成的,任一方可提交 aitalky 运营方所在地有管辖权的人民法院诉讼解决。</p>

<h3>十二、联系我们</h3>
<p>如对订阅、计费或本协议有任何疑问,请通过 support@aitalky.com 与我们联系。</p>'
WHERE `type`='subscription' AND `language`='zh_CN';

UPDATE `pf_agreement` SET `title`='Subscription Agreement', `version`='v1.0', `update_time`=NOW(), `content`=
'<h2>aitalky Subscription Agreement</h2>
<p>Last updated: June 2026. This Subscription Agreement (the “Agreement”) is entered into between you and the operator of aitalky regarding the subscription, purchase, and use of paid plans and add-on packs on the Platform. Together with the Terms of Service and the Privacy Policy, it forms the complete arrangement. Please read it carefully before subscribing; completing an order and payment constitutes acceptance of this Agreement.</p>

<h3>1. Plans and Add-On Packs</h3>
<ul>
<li>The Platform offers subscription plans at different tiers (such as Basic, Standard, and Pro), each including corresponding features and resource quotas (agent seats, translation allowance, customer quota, public article / hosted-site quota, and so on).</li>
<li>Beyond the base plan, you may purchase <strong>add-on packs</strong> (such as a translation pack, an AI Tokens pack, and an agent-seat pack) to increase the relevant resource limits as needed.</li>
<li>The features, quotas, and prices of each plan and add-on pack are as displayed on the order page, and we may adjust the product lineup from time to time.</li>
</ul>

<h3>2. Billing and Minimum Term</h3>
<ul>
<li>Subscriptions are billed by billing cycle (for example monthly), and some plans have a minimum term (such as 6 months) as described for each plan.</li>
<li>The amount, currency (such as USD), and taxes are as displayed at the time of ordering; amounts are computed with high-precision values to avoid rounding errors.</li>
<li>Add-on packs are billed according to their pricing method (by allowance, by seat, or one-time).</li>
</ul>

<h3>3. Orders and Payment</h3>
<ul>
<li>You must complete payment through the payment channels designated by the Platform; an order takes effect after we confirm receipt of payment.</li>
<li>The payment currency is the one selected at the time of ordering; differences arising from exchange rates or payment channels are handled under the applicable rules.</li>
<li>Please verify your order details before paying; once payment succeeds, the corresponding entitlements take effect according to the plan.</li>
</ul>

<h3>4. Renewal and Expiry</h3>
<ul>
<li>If you do not renew after expiry, the paid features and resources beyond any free allowance will stop, while Customer Data already generated is handled under the Privacy Policy retention rules.</li>
<li>If auto-renewal is enabled, we will charge before expiry at the agreed cycle and price; you may disable auto-renewal before expiry.</li>
<li>After expiry or downgrade, if your actual usage (such as the number of published articles, sites, or seats) exceeds the new limits, the related features may be restricted, and you should adjust your usage to within the limits.</li>
</ul>

<h3>5. Quotas and Usage</h3>
<ul>
<li>Each resource (seats, translation characters, customer quota, public article/site quota, AI Tokens, and so on) is used within the limits set by the plan and add-on packs. Operations beyond the limits will be restricted until you upgrade the plan or purchase an add-on pack.</li>
<li>Quota usage is determined by the Platform back-end accounting. You must not use technical means to circumvent or break the quota and billing mechanisms.</li>
</ul>

<h3>6. Upgrades, Downgrades, and Changes</h3>
<ul>
<li>You may upgrade your plan or purchase additional add-on packs during the subscription term; new entitlements take effect immediately and fees are calculated under the applicable rules.</li>
<li>Downgrades generally take effect from the next billing cycle and may reduce certain features or limits; you are responsible for assessing and bearing the resulting impact.</li>
</ul>

<h3>7. Refund Policy</h3>
<ul>
<li>Except as required by mandatory law or otherwise committed by us in writing, fees for services already subscribed and activated are in principle <strong>non-refundable</strong>.</li>
<li>If the service is unavailable for an extended period due to our fault and cannot be remedied, you may request reasonable compensation or a pro-rated refund for the affected cycle.</li>
<li>If the service is suspended or terminated because you breached the Terms of Service, fees paid are non-refundable.</li>
</ul>

<h3>8. Overdue Payment and Suspension</h3>
<p>If a subscription expires without renewal or an auto-renewal charge fails, we may suspend the corresponding paid features. You bear the impact during suspension; after you complete renewal, we will restore the service within a reasonable time.</p>

<h3>9. Price Changes</h3>
<p>We may adjust the prices of plans and add-on packs as needed for operations. Price changes do not affect the price within your current effective subscription cycle; they apply at renewal or for new orders and will be announced in advance.</p>

<h3>10. Termination</h3>
<p>You may terminate your subscription by ceasing to renew. We may suspend or terminate paid services to you if you materially breach the Terms of Service or this Agreement. After termination, data is handled in accordance with the Privacy Policy.</p>

<h3>11. Governing Law and Disputes</h3>
<p>This Agreement is governed by the laws of the mainland of the People Republic of China. Disputes arising from this Agreement shall first be resolved through friendly negotiation; failing that, either party may bring proceedings before the competent people court at the location of the aitalky operator.</p>

<h3>12. Contact Us</h3>
<p>If you have any questions about subscriptions, billing, or this Agreement, please contact us at support@aitalky.com.</p>'
WHERE `type`='subscription' AND `language`='en_US';

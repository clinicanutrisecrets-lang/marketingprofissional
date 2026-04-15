# Meta App Review — Descrições de Uso

Cole essas descrições no campo **"How you're using this permission"** de cada permissão.

---

## `instagram_content_publish`

> Our platform automates Instagram content publishing for Brazilian nutritionists 
> who are franchisees of the Scanner da Saúde network. Each nutritionist connects 
> her Instagram Business account to the platform. Our system generates weekly 
> content (feed posts, carousels, reels and stories) using AI, which the 
> nutritionist manually reviews and approves. Once approved, the system uses 
> `instagram_content_publish` to publish the media container on the scheduled 
> date through the Graph API. No post is ever published without explicit human 
> approval. The nutritionist maintains full control and can cancel/edit any 
> post before publishing. This automation allows health professionals to 
> maintain consistent social media presence focused on evidence-based nutrition 
> content, while preserving editorial control.

---

## `instagram_manage_insights`

> We use `instagram_manage_insights` to fetch engagement metrics (reach, 
> impressions, likes, comments, saves, profile visits) for posts published 
> through our platform. These metrics are displayed in a weekly dashboard that 
> helps the nutritionist understand which content formats and topics perform 
> best with her audience. All metrics are fetched on a read-only basis. Each 
> nutritionist only sees metrics for her own account — we use Supabase Row 
> Level Security to enforce strict multi-tenancy. Metrics are cached for 24h 
> to minimize API calls.

---

## `pages_show_list`

> During the initial Instagram connection flow, we use `pages_show_list` to 
> retrieve the list of Facebook Pages the user administers. This is necessary 
> because each Instagram Business account is linked to a Facebook Page. The 
> user selects which Page corresponds to her Instagram Business account, and 
> we store the Instagram Business Account ID for future Graph API calls. This 
> list is only used at connection time and is not stored long-term.

---

## `pages_read_engagement`

> We use `pages_read_engagement` to read metadata about the Instagram Business 
> account linked to the selected Facebook Page, including username, profile 
> picture and follower count. This information is used to display the 
> connected account in the dashboard and to personalize reports. Data is 
> read-only.

---

## `ads_management` (somente se for usar)

> Our platform allows each nutritionist franchisee to create and manage Meta 
> Ads campaigns directly from our dashboard. Using `ads_management`, we create 
> campaigns with pre-filled configurations based on health/nutrition niche 
> benchmarks (CTR, CPL). The nutritionist reviews the creative, targeting and 
> budget before launch. After approval, we create the campaign via the 
> Marketing API. The nutritionist retains full control: can pause, edit, or 
> cancel at any time. We never spend ad budget without explicit launch 
> authorization. All campaign data is isolated per nutritionist via Row Level 
> Security.

---

## `business_management` (somente se for usar)

> We use `business_management` to list ad accounts and business assets 
> accessible to the nutritionist, so she can select which ad account should 
> be used for her campaigns. This avoids her having to manually copy ad 
> account IDs. Read-only access at setup time.

---

## `instagram_basic`

> We use `instagram_basic` to read the basic profile information (username, 
> profile picture, account type) of the Instagram Business account the 
> nutritionist connects. This is displayed in the platform dashboard so she 
> can confirm the correct account is linked before any publishing action.

---

## Notas pra cada formulário

**"What does your app do?"**
> Scanner da Saúde is a SaaS platform that automates digital marketing for 
> Brazilian health professionals — specifically nutritionists operating as 
> franchisees of our network. The platform generates AI-powered content 
> (feed posts, reels, stories), publishes it to the professional's connected 
> Instagram account after their review and approval, tracks engagement 
> metrics, and manages Meta Ads campaigns. All actions require explicit 
> authorization from the nutritionist. We operate under Brazil's LGPD and 
> serve Portuguese-speaking health professionals in Brazil.

**"How will your use of this feature improve user experience?"**
> Health professionals save 5-10 hours per week on content creation while 
> maintaining editorial control. The platform ensures compliance with Brazil's 
> Council of Nutrition (CFN) advertising regulations. Clients benefit from 
> more consistent, science-based nutrition content on their feeds.

**"Detailed Description"**
> See full platform documentation at https://app.scannerdasaude.com, including:
> - Privacy Policy: https://app.scannerdasaude.com/privacidade
> - Terms: https://app.scannerdasaude.com/termos
> - Data Deletion: https://app.scannerdasaude.com/deletar-dados

import { useParams, Link } from 'react-router-dom';
import { Calendar, Clock, User, ArrowLeft, ArrowRight } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import PageTransition from '@/components/layout/PageTransition';
import blogsData from '@/data/blogs.json';

const BlogDetails = () => {
  const { id } = useParams();
  const blog = blogsData.find((b) => b.id === id);

  if (!blog) {
    return (
      <Layout>
        <PageTransition>
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground mb-4">Article Not Found</h1>
              <Link to="/blog" className="btn-primary">Back to Blog</Link>
            </div>
          </div>
        </PageTransition>
      </Layout>
    );
  }

  const relatedBlogs = blogsData
    .filter((b) => b.category === blog.category && b.id !== blog.id)
    .slice(0, 2);

  const contentParagraphs = blog.content.split('\n\n').map((paragraph, index) => {
    if (paragraph.startsWith('## ')) {
      return (
        <h2 key={index} className="text-xl font-bold text-foreground mt-8 mb-3">
          {paragraph.replace('## ', '')}
        </h2>
      );
    }
    return (
      <p key={index} className="text-muted-foreground leading-relaxed mb-4">
        {paragraph}
      </p>
    );
  });

  return (
    <Layout>
      <PageTransition>
        {/* Hero Image */}
        <div className="relative h-[350px] md:h-[450px]">
          <img src={blog.image} alt={blog.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
            <div className="page-container">
              <Link to="/blog" className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors">
                <ArrowLeft className="h-5 w-5" /> Back to Blog
              </Link>
              <span className="inline-block bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full mb-3">
                {blog.category}
              </span>
              <h1 className="text-3xl md:text-4xl font-bold text-white font-serif mb-3">{blog.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-white/80 text-sm">
                <span className="flex items-center gap-1"><User className="h-4 w-4" />{blog.author}</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(blog.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{blog.readTime}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <section className="py-12 bg-background">
          <div className="page-container">
            <div className="max-w-3xl mx-auto">
              <article className="bg-card rounded-xl p-6 md:p-10 shadow-card">
                {contentParagraphs}
              </article>

              {/* Related */}
              {relatedBlogs.length > 0 && (
                <div className="mt-12">
                  <h3 className="text-2xl font-bold text-foreground mb-6">Related Articles</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {relatedBlogs.map((rb) => (
                      <Link key={rb.id} to={`/blog/${rb.id}`} className="card-travel group flex flex-col">
                        <img src={rb.image} alt={rb.title} className="w-full h-40 object-cover" loading="lazy" />
                        <div className="p-4">
                          <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">{rb.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{rb.shortDescription}</p>
                          <span className="flex items-center gap-1 text-sm font-medium text-primary mt-3 group-hover:gap-2 transition-all">
                            Read More <ArrowRight className="h-4 w-4" />
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </PageTransition>
    </Layout>
  );
};

export default BlogDetails;

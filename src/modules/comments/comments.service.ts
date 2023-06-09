import * as schema from "~/db/schema"
import { CreateComment } from "./comments.validation"
import { db } from "~/db/"
import { and, desc, eq, sql } from "drizzle-orm"
import { Comment, CommentModel } from "./comments.types"
import { createId } from "~/utils/id"

class CommentService {
    private database: typeof db

    constructor(database: typeof db) {
        this.database = database
    }

    async getCommentsFromArticleId(
        articleId: string,
        currentUserId: string | null,
    ): Promise<Comment[]> {
        const comments = await this.database
            .select({
                id: schema.comment.id,
                body: schema.comment.body,
                author: {
                    name: schema.user.name,
                    bio: schema.user.bio,
                    image: schema.user.image,
                    following:
                        sql`CASE WHEN ${schema.follow.id} IS NOT NULL THEN 1 ELSE 0 END`.as(
                            "following",
                        ),
                },
            })
            .from(schema.comment)
            .leftJoin(schema.user, eq(schema.user.id, schema.comment.author_id))
            .leftJoin(
                schema.follow,
                and(
                    eq(schema.follow.follower_id, sql`${currentUserId}`),
                    eq(schema.follow.following_id, schema.comment.author_id),
                ),
            )
            .where(eq(schema.comment.article_id, articleId))
            .orderBy(desc(schema.comment.id))
            .all()

        for (const comment of comments) {
            if (!comment.author) {
                continue
            }
            comment.author.following = comment.author?.following === "1"
        }

        return comments as unknown as Comment[]
    }

    async createComment(args: {
        body: CreateComment["body"]
        articleSlug: string
        authorId: string
    }): Promise<CommentModel> {
        const { articleSlug, authorId, body } = args

        const article = await this.database.query.article.findFirst({
            where: eq(schema.article.slug, articleSlug),
            columns: {
                id: true,
            },
        })

        if (!article) {
            throw new Error("Article not found")
        }

        const comment = await this.database
            .insert(schema.comment)
            .values({
                id: createId(),
                body,
                article_id: article.id,
                author_id: authorId,
            })
            .returning()
            .get()

        return comment
    }

    /**
     * @throws {Error} if comment to delete not found
     */
    async deleteComment(args: {
        commentId: string
        userId: string
    }): Promise<CommentModel> {
        const { commentId, userId } = args

        const comment = await this.database
            .delete(schema.comment)
            .where(
                and(
                    eq(schema.comment.id, commentId),
                    eq(schema.comment.author_id, userId),
                ),
            )
            .returning()
            .get()

        if (!comment) {
            throw new Error("Comment to delete not found")
        }

        return comment
    }

    async isCommentAuthor(args: {
        commentId: string
        userId: string
    }): Promise<boolean> {
        const { commentId, userId } = args

        const comment = await this.database.query.comment.findFirst({
            where: eq(schema.comment.id, commentId),
            columns: {
                author_id: true,
            },
        })

        if (!comment) {
            return false
        }

        return comment.author_id === userId
    }
}

export const commentsService = new CommentService(db)

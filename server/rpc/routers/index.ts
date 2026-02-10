import { serieRouter } from "./serie"
import { chapterRouter } from "./chapter"
import { userRouter } from "./user"

export const router = {
	serie: serieRouter,
	chapter: chapterRouter,
	user: userRouter,
}

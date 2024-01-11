import mongoose, { Schema } from "mongoose";

const playListSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        desciption: {
            type: String,
            required: true,
        },
        video: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video",
            },
        ],
        owner:{
            type:Schema.Types.ObjectId,
            ref:"User"
        }
    },
    { timestamps: true }
);

export const PlayList = mongoose.model("Playlist", playListSchema);

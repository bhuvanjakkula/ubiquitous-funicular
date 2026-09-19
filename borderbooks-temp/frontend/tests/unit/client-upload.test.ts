import {readFileSync} from "node:fs";
import {join} from "node:path";
import {describe,expect,it,vi} from "vitest";
import {asError} from "../../src/lib/errors";
import {uploadFile} from "../../src/lib/upload-file";

describe("client fixture upload",()=>{
  it("normalizes DOM events into Error objects",()=>{
    const error=asError(new Event("error"),"Fixture read failed");
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("Fixture read failed (error)");
  });

  it("reads a fixture File and posts it to /api/uploads without throwing",async()=>{
    const bytes=readFileSync(join(process.cwd(),"tests","fixtures","invoices.csv"));
    const file=new File([bytes],"invoices.csv",{type:"text/csv"});
    const request=vi.fn(async(input:string|URL|Request,init?:RequestInit)=>{
      expect(input).toBe("/api/uploads");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBeInstanceOf(FormData);
      const form=init?.body as FormData;
      expect(form.get("kind")).toBe("invoices");
      const posted=form.get("file");
      expect(posted).toBeInstanceOf(File);
      expect(Buffer.from(await (posted as File).arrayBuffer())).toEqual(bytes);
      return Response.json({id:"upload-fixture"},{status:201});
    }) as typeof fetch;
    await expect(uploadFile("invoices",file,request)).resolves.toEqual({id:"upload-fixture"});
  });
});
